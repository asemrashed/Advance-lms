'use client';

import { resolveUploadSrc } from '@/lib/resolveUploadSrc';

type PdfJsModule = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJsModule> | null = null;
let workerConfigured = false;

/**
 * Rewrite stored PDF paths to durable API routes:
 * - `/uploads/pdf/{id}` → `/api/files/pdf/{id}` (Mongo-backed notes/resources)
 * - other `/uploads/...` → `/api/files/uploads/...` (assignments, etc.)
 */
export function toDurablePdfPath(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return trimmed;

  let pathOnly = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      pathOnly = new URL(trimmed).pathname;
    }
  } catch {
    // keep trimmed
  }

  const notesMatch = pathOnly.match(/^\/uploads\/pdf\/([^/?#]+?)(?:\.pdf)?$/i);
  if (notesMatch?.[1]) {
    return `/api/files/pdf/${encodeURIComponent(notesMatch[1])}`;
  }

  // Assignments and other local uploads — serve via authenticated API route.
  if (pathOnly.startsWith('/uploads/') || /^https?:\/\//i.test(trimmed)) {
    return resolveUploadSrc(trimmed);
  }

  return trimmed.startsWith('/') || trimmed.startsWith('blob:')
    ? trimmed
    : `/${trimmed}`;
}

/** Ensure relative upload paths resolve against the current origin. */
export function resolvePdfUrl(url: string): string {
  const durable = toDurablePdfPath(url);
  if (!durable) return durable;
  if (durable.startsWith('http://') || durable.startsWith('https://') || durable.startsWith('blob:')) {
    return durable;
  }
  if (typeof window === 'undefined') return durable;
  if (durable.startsWith('/')) {
    return `${window.location.origin}${durable}`;
  }
  return `${window.location.origin}/${durable.replace(/^\.\//, '')}`;
}

export async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      if (!workerConfigured && typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        workerConfigured = true;
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export async function loadPdfDocument(url: string) {
  const pdfjs = await loadPdfJs();
  const resolved = resolvePdfUrl(url);
  const sameOrigin =
    typeof window !== 'undefined' && resolved.startsWith(window.location.origin);
  const loadingTask = pdfjs.getDocument({
    url: resolved,
    ...(sameOrigin ? { withCredentials: true } : {}),
  });
  return loadingTask.promise;
}
