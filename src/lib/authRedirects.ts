import { isAdminAreaRole } from "@/lib/roles";

export type AuthRole =
  | "super_admin"
  | "admin"
  | "instructor"
  | "student"
  | string
  | undefined
  | null;

export const AUTH_GUEST_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

export function roleDashboardPath(role: AuthRole): string {
  if (isAdminAreaRole(role)) return "/admin/dashboard";
  if (role === "instructor") return "/instructor/dashboard";
  if (role === "student") return "/student/dashboard";
  return "/";
}

export function isAuthGuestPath(pathname: string): boolean {
  return AUTH_GUEST_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Only allow same-origin relative callback paths. */
export function sanitizeCallbackUrl(
  callbackUrl: string | null | undefined,
): string | null {
  if (!callbackUrl) return null;
  const trimmed = callbackUrl.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login") || isAuthGuestPath(trimmed)) return null;
  return trimmed;
}

/** Role required for a post-login callback path, if any. */
export function requiredRoleForPath(pathname: string): AuthRole | null {
  const path = pathname.split("?")[0] || pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return "admin";
  if (path === "/instructor" || path.startsWith("/instructor/"))
    return "instructor";
  if (path === "/student" || path.startsWith("/student/")) return "student";
  return null;
}

function roleSatisfiesRequired(role: AuthRole, needed: AuthRole): boolean {
  if (needed === "admin") return isAdminAreaRole(role);
  return needed === role;
}

export function postAuthRedirectPath(
  role: AuthRole,
  callbackUrl?: string | null,
): string {
  const safe = sanitizeCallbackUrl(callbackUrl);
  if (safe) {
    const needed = requiredRoleForPath(safe);
    if (!needed || roleSatisfiesRequired(role, needed)) return safe;
  }
  return roleDashboardPath(role);
}
