import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import {
  isAuthGuestPath,
  postAuthRedirectPath,
  roleDashboardPath,
} from "@/lib/authRedirects";
import { isAdminAreaRole } from "@/lib/roles";

const requiredRole = (p: string) =>
  p.startsWith("/admin/")
    ? "admin"
    : p.startsWith("/instructor/")
      ? "instructor"
      : p.startsWith("/student/")
        ? "student"
        : null;

const withCallbackUrl = (req: NextRequest) => {
  const loginUrl = new URL("/login", req.url);
  const callbackUrl = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  return loginUrl;
};

function asJwt(token: Awaited<ReturnType<typeof getToken>>): JWT | null {
  if (!token || typeof token === "string") return null;
  return token;
}

function hasActiveSession(token: Awaited<ReturnType<typeof getToken>>) {
  const jwt = asJwt(token);
  return Boolean(jwt?.sub && jwt.sessionInvalid !== true);
}

/**
 * next-auth cookie *writes* use the request URL (https → __Secure-...),
 * but getToken defaults to NEXTAUTH_URL.startsWith("https://").
 * A leading space in NEXTAUTH_URL breaks that check and causes login loops.
 */
function useSecureAuthCookie(req: NextRequest): boolean {
  const configured = (process.env.NEXTAUTH_URL || "").trim();
  if (configured.startsWith("https://")) return true;
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded?.split(",")[0]?.trim() === "https") return true;
  return req.nextUrl.protocol === "https:";
}

function authSecret() {
  return (process.env.NEXTAUTH_SECRET || "").trim() || undefined;
}

async function readAuthToken(req: NextRequest) {
  return getToken({
    req,
    secret: authSecret(),
    secureCookie: useSecureAuthCookie(req),
  });
}

/**
 * Edge middleware cannot talk to MongoDB. Trust JWT claims here;
 * live device checks stay in /api/auth/session/validate + client hooks.
 * Do not self-fetch that API from middleware — behind HTTPS proxies it
 * often fails and falsely logs the user out (redirect loop).
 */
function isDeviceSessionValid(token: JWT) {
  if (token.sessionInvalid === true) return false;
  if (isAdminAreaRole(token.role)) return true;
  if (process.env.DEVICE_FORCE_LOGOUT !== "true") return true;
  return Boolean(token.sessionId);
}

function roleMatchesPath(tokenRole: string | undefined, pathRole: string) {
  if (pathRole === "admin") return isAdminAreaRole(tokenRole);
  return tokenRole === pathRole;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isAuthGuestPath(pathname)) {
    const token = await readAuthToken(req);
    if (hasActiveSession(token) && isDeviceSessionValid(asJwt(token)!)) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      const destination = postAuthRedirectPath(
        String(asJwt(token)!.role || "student"),
        callbackUrl,
      );
      return NextResponse.redirect(new URL(destination, req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const token = await readAuthToken(req);
    if (!hasActiveSession(token) || !isDeviceSessionValid(asJwt(token)!)) {
      return NextResponse.redirect(withCallbackUrl(req));
    }
    const dest = roleDashboardPath(String(asJwt(token)!.role || "student"));
    return NextResponse.redirect(new URL(dest, req.url));
  }

  const role = requiredRole(pathname);
  if (!role) return NextResponse.next();

  const token = await readAuthToken(req);
  if (
    !hasActiveSession(token) ||
    !roleMatchesPath(String(asJwt(token)!.role || ""), role) ||
    !isDeviceSessionValid(asJwt(token)!)
  ) {
    return NextResponse.redirect(withCallbackUrl(req));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/dashboard",
    "/dashboard/:path*",
    "/student/:path*",
    "/instructor/:path*",
    "/admin/:path*",
  ],
};
