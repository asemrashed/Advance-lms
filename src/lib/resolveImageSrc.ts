/**
 * Normalize stored image URLs for <img src>.
 * - Strips localhost absolute URLs to same-origin paths
 * - Serves /uploads/... through /api/files/image/... so thumbnails work
 *   when reverse proxies do not expose the public folder.
 */
export function resolveImageSrc(raw: string | null | undefined): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";

  let pathOnly = trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      const isLocal =
        host === "localhost" || host === "127.0.0.1" || host === "::1";
      const isAppUpload =
        parsed.pathname.startsWith("/uploads/") ||
        parsed.pathname.startsWith("/api/files/");
      if (isLocal || isAppUpload) {
        pathOnly = `${parsed.pathname}${parsed.search}`;
      } else {
        return trimmed;
      }
    } catch {
      return trimmed;
    }
  }

  if (!pathOnly.startsWith("/")) {
    pathOnly = `/${pathOnly}`;
  }

  if (pathOnly.startsWith("/uploads/")) {
    return `/api/files/image/${pathOnly.slice("/uploads/".length)}`;
  }

  return pathOnly;
}
