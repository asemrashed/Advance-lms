import type { NextRequest } from "next/server";
import { resolveResourcePdfUrl } from "@/app/api/_lib/resolveResourcePdfUrl";

function isLocalHost(host: string) {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
}

/** Preferred public site origin for redirects (avoids baking localhost from request.url). */
export function publicOriginFromRequest(request: NextRequest): string {
  const envUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const hostHeader = request.headers.get("host")?.trim();

  if (forwardedHost && !isLocalHost(forwardedHost.split(":")[0] || forwardedHost)) {
    const proto =
      forwardedProto ||
      (envUrl.startsWith("https") ? "https" : "https");
    return `${proto}://${forwardedHost}`;
  }

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (!isLocalHost(parsed.hostname)) return envUrl;
    } catch {
      /* ignore */
    }
  }

  if (hostHeader && !isLocalHost(hostHeader.split(":")[0] || hostHeader)) {
    const proto = forwardedProto || (envUrl.startsWith("http:") ? "http" : "https");
    return `${proto}://${hostHeader}`;
  }

  if (envUrl) return envUrl;

  return new URL(request.url).origin;
}

/** Absolute URL for NextResponse.redirect, never preferring internal localhost when a public host is known. */
export function toPublicAbsoluteUrl(
  pathOrUrl: string,
  request: NextRequest,
): string {
  const normalized = resolveResourcePdfUrl(pathOrUrl, request);
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      if (isLocalHost(parsed.hostname)) {
        return new URL(
          `${parsed.pathname}${parsed.search}`,
          `${publicOriginFromRequest(request)}/`,
        ).toString();
      }
    } catch {
      /* fall through */
    }
    return normalized;
  }
  return new URL(
    normalized.startsWith("/") ? normalized : `/${normalized}`,
    `${publicOriginFromRequest(request)}/`,
  ).toString();
}
