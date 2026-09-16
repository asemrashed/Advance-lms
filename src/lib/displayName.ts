type NameLike = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null | undefined;

/** Canonical display name: prefers `name`, falls back to legacy first/last fields. */
export function getDisplayName(
  user: NameLike,
  fallback = "Unknown",
): string {
  const name = String(user?.name || "").trim();
  if (name) return name;

  const legacy = [user?.firstName, user?.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  if (legacy) return legacy;

  const email = String(user?.email || "").trim();
  if (email) return email;

  return fallback;
}

/** Resolve a trimmed name from request body (`name` or legacy first+last). */
export function resolveNameFromBody(body: Record<string, unknown>): string {
  const direct = String(body.name || "").trim();
  if (direct) return direct;

  const legacy = [body.firstName, body.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return legacy;
}

export function getNameInitials(name: string, fallback = "??"): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) {
    const ch = parts[0].charAt(0).toUpperCase();
    return ch ? `${ch}${ch}` : fallback;
  }
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || fallback;
}
