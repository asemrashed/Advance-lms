import type { NextRequest } from "next/server";
import { sanitizePdfPublicId } from "@/lib/pdf/extractPdfText";
import { apiPdfUrl } from "@/lib/pdf/pdfStorage";

/**
 * Normalize stored PDF URLs for the browser viewer.
 *
 * Uploads are saved as same-origin paths (`/uploads/pdf/...` or `/api/files/pdf/...`).
 * Absolutizing them with `request.url` can bake in `http(s)://localhost:...` which
 * then fails on production.
 */
export function resolveResourcePdfUrl(storedUrl: string, _request?: NextRequest): string {
  const trimmed = storedUrl.trim();
  if (!trimmed) return trimmed;

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isLocalHost =
      host === "localhost" || host === "127.0.0.1" || host === "::1";
    const isAppUpload =
      parsed.pathname.startsWith("/uploads/") ||
      parsed.pathname.startsWith("/api/");

    // Same-app assets should always be served from the current origin.
    if (isLocalHost || isAppUpload) {
      return `${parsed.pathname}${parsed.search}`;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/** Pull publicId from stored worksheet/note PDF URL shapes. */
export function extractPdfPublicIdFromUrl(storedUrl: string): string | null {
  const pathOnly = resolveResourcePdfUrl(storedUrl);
  const apiMatch = pathOnly.match(/^\/api\/files\/pdf\/([^/?#]+)/i);
  if (apiMatch?.[1]) {
    return sanitizePdfPublicId(decodeURIComponent(apiMatch[1]));
  }
  const uploadMatch = pathOnly.match(/^\/uploads\/pdf\/([^/?#]+?)(?:\.pdf)?$/i);
  if (uploadMatch?.[1]) {
    return sanitizePdfPublicId(uploadMatch[1]);
  }
  return null;
}

/**
 * Resolve a stored PDF URL for the browser.
 *
 * Always prefer `/api/files/pdf/...` for app-managed files: that route reads
 * local disk first, then Mongo/Cloudinary. Returning `/uploads/pdf/...` breaks
 * on other hosts (or www vs apex) where the file is not on disk even though
 * Mongo has it — which is why instructors could open notes while students saw 404.
 */
export async function resolveServingPdfUrl(
  storedUrl: string,
  pdfPublicId?: string | null,
  request?: NextRequest,
): Promise<string> {
  const normalized = resolveResourcePdfUrl(storedUrl, request);
  if (/^https?:\/\//i.test(normalized) && !normalized.includes("/uploads/") && !normalized.includes("/api/files/pdf/")) {
    return normalized;
  }

  const publicId =
    sanitizePdfPublicId(String(pdfPublicId || "").trim()) ||
    extractPdfPublicIdFromUrl(normalized);

  if (!publicId) return normalized;
  return apiPdfUrl(publicId);
}
