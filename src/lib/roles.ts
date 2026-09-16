/** Platform staff roles that share the `/admin/*` area. */
export type AdminAreaRole = "super_admin" | "admin";

export type AppRole = AdminAreaRole | "instructor" | "student";

export const ADMIN_AREA_ROLES: readonly AdminAreaRole[] = [
  "super_admin",
  "admin",
] as const;

export function isAdminAreaRole(
  role: string | null | undefined,
): role is AdminAreaRole {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "super_admin";
}

/** Normalize dashboard shell role: both staff roles use the admin UI chrome. */
export function toDashboardShellRole(
  role: string | null | undefined,
): "admin" | "instructor" | "student" | null {
  if (isAdminAreaRole(role)) return "admin";
  if (role === "instructor" || role === "student") return role;
  return null;
}
