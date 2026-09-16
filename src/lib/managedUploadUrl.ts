/** Pure URL helpers for uploads we store (local /uploads, API paths, or our S3 bucket). */

const MANAGED_FOLDERS = new Set([
  "courses",
  "cms",
  "branding",
  "batches",
  "avatars",
  "payment-proofs",
  "assignments",
  "review-videos",
  "pdf",
]);

export type ParsedManagedUpload =
  | { kind: "relative"; relative: string; folder: string }
  | { kind: "s3Key"; key: string; folder: string };

function folderFromRelative(relative: string): string | null {
  const folder = relative.split("/").filter(Boolean)[0];
  return folder && MANAGED_FOLDERS.has(folder) ? folder : null;
}

function folderFromS3Key(key: string): string | null {
  const parts = key.replace(/^\/+/, "").split("/");
  if (parts[0] !== "lms" || parts.length < 3) return null;
  const folder = parts[1] === "pdfs" ? "pdf" : parts[1];
  return MANAGED_FOLDERS.has(folder) ? folder : null;
}

/** Whether this URL points at storage we manage (not Unsplash, Cloudinary, etc.). */
export function isManagedUploadUrl(raw: string | null | undefined): boolean {
  return parseManagedUploadUrl(raw) !== null;
}

export function parseManagedUploadUrl(
  raw: string | null | undefined,
): ParsedManagedUpload | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;

  // S3 virtual-hosted URL for our bucket
  if (/^https?:\/\//i.test(trimmed) && trimmed.includes(".amazonaws.com/")) {
    try {
      const u = new URL(trimmed);
      const key = u.pathname.replace(/^\/+/, "");
      if (!key.startsWith("lms/")) return null;
      const folder = folderFromS3Key(key);
      if (!folder) return null;
      return { kind: "s3Key", key, folder };
    } catch {
      return null;
    }
  }

  let pathOnly = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (
        u.pathname.startsWith("/uploads/") ||
        u.pathname.startsWith("/api/files/uploads/")
      ) {
        pathOnly = u.pathname;
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  if (pathOnly.startsWith("/api/files/uploads/")) {
    const relative = pathOnly.slice("/api/files/uploads/".length);
    const folder = folderFromRelative(relative);
    return folder ? { kind: "relative", relative, folder } : null;
  }

  if (pathOnly.startsWith("/uploads/")) {
    const relative = pathOnly.slice("/uploads/".length);
    const folder = folderFromRelative(relative);
    return folder ? { kind: "relative", relative, folder } : null;
  }

  return null;
}
