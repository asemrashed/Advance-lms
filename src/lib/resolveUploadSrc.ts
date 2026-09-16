/**
 * Normalize stored upload URLs for browser links.
 * - Strips localhost absolute URLs to same-origin paths
 * - Serves /uploads/... through /api/files/uploads/... so proofs/files work
 *   when reverse proxies do not expose the public folder (common on VPS).
 */
export function resolveUploadSrc(raw: string | null | undefined): string {
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
        // External CDN (e.g. S3 / Cloudinary) — use as-is.
        return trimmed;
      }
    } catch {
      return trimmed;
    }
  }

  if (!pathOnly.startsWith("/")) {
    pathOnly = `/${pathOnly}`;
  }

  if (pathOnly.startsWith("/api/files/uploads/")) {
    return pathOnly;
  }

  // Legacy image API path — keep working for image-only uploads.
  if (pathOnly.startsWith("/api/files/image/")) {
    return pathOnly;
  }

  if (pathOnly.startsWith("/uploads/")) {
    return `/api/files/uploads/${pathOnly.slice("/uploads/".length)}`;
  }

  return pathOnly;
}
