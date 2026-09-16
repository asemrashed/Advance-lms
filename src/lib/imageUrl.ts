/** Shown when a non-HTTPS remote image URL is submitted. */
export const IMAGE_URL_HTTPS_ERROR =
  "Only secure HTTPS image links are allowed. HTTP links cannot be saved.";

export type ImageUrlValidation =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Validates an image URL for persistence.
 * Allows empty, local `/uploads/...` paths, and `https://` URLs.
 * Rejects `http://` and other schemes.
 */
export function validateImageUrl(raw: unknown): ImageUrlValidation {
  if (raw == null) return { ok: true, url: "" };
  if (typeof raw !== "string") {
    return { ok: false, error: "Image URL must be a string" };
  }

  const url = raw.trim();
  if (!url) return { ok: true, url: "" };

  // Uploaded files are stored as site-relative paths (or API-served upload URLs).
  if (
    url.startsWith("/uploads/") ||
    url.startsWith("/api/files/image/") ||
    url.startsWith("/")
  ) {
    if (url.includes("://") || url.startsWith("//")) {
      return { ok: false, error: IMAGE_URL_HTTPS_ERROR };
    }
    return { ok: true, url };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      ok: false,
      error: "Enter a valid image URL starting with https://",
    };
  }

  if (parsed.protocol === "https:") {
    return { ok: true, url };
  }

  if (parsed.protocol === "http:") {
    return { ok: false, error: IMAGE_URL_HTTPS_ERROR };
  }

  return { ok: false, error: IMAGE_URL_HTTPS_ERROR };
}

/** Returns an error message if the URL is not allowed; otherwise null. */
export function imageUrlError(raw: unknown): string | null {
  const result = validateImageUrl(raw);
  return result.ok ? null : result.error;
}

/** Keys that hold image URLs in CMS/settings payloads — not display names like logoText. */
export function isImageUrlFieldKey(key: string): boolean {
  const k = key.trim();
  if (!k) return false;

  if (k.endsWith("Url") || k.endsWith("Image")) {
    return /(?:image|logo|favicon|avatar|thumbnail|portrait|cover|photo|banner|hero)/i.test(
      k,
    );
  }

  return (
    k === "main" ||
    k === "secondary" ||
    k === "image" ||
    k === "avatar" ||
    k === "thumbnail" ||
    k === "portrait" ||
    k === "cover"
  );
}

/**
 * Walks CMS/settings objects and rejects any image-like field that uses http://.
 */
export function findInsecureImageUrlInObject(
  value: unknown,
  path = "",
  treatAsImageUrl = false,
): string | null {
  if (typeof value === "string") {
    if (!treatAsImageUrl) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const result = validateImageUrl(trimmed);
    if (!result.ok) {
      return path ? `${path}: ${result.error}` : result.error;
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const err = findInsecureImageUrlInObject(
        value[i],
        path ? `${path}[${i}]` : `[${i}]`,
        treatAsImageUrl,
      );
      if (err) return err;
    }
    return null;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const isImageKey = isImageUrlFieldKey(key);
      const nextPath = path ? `${path}.${key}` : key;
      if (typeof child === "string") {
        if (!isImageKey) continue;
        const err = findInsecureImageUrlInObject(child, nextPath, true);
        if (err) return err;
        continue;
      }
      if (child && typeof child === "object") {
        const err = findInsecureImageUrlInObject(child, nextPath, false);
        if (err) return err;
      }
    }
  }

  return null;
}
