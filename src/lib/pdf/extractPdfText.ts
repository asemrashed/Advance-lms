import { PDFParse } from "pdf-parse";
import { apiPdfUrl, readPdfBuffer } from "@/lib/pdf/pdfStorage";

/** Safe publicId from `POST /api/upload/pdf` (no path traversal). */
export function sanitizePdfPublicId(publicId: string) {
  const trimmed = publicId.trim();
  if (!trimmed || !/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function pdfPublicUrl(publicId: string) {
  return apiPdfUrl(publicId);
}

export async function extractTextFromUploadedPdf(publicId: string): Promise<{
  text: string;
  publicId: string;
  url: string;
}> {
  const safeId = sanitizePdfPublicId(publicId);
  if (!safeId) {
    throw new Error("INVALID_PDF_PUBLIC_ID");
  }

  const buffer = await readPdfBuffer(safeId);
  if (!buffer) {
    throw new Error("PDF_NOT_FOUND");
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = String(result.text || "")
      .replace(/\s+\n/g, "\n")
      .trim();

    if (text.length < 50) {
      throw new Error("PDF_TEXT_TOO_SHORT");
    }

    return { text, publicId: safeId, url: apiPdfUrl(safeId) };
  } finally {
    await parser.destroy();
  }
}
