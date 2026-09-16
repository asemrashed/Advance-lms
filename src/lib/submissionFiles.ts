import { deleteUploadByUrl } from "@/lib/mediaStorage";
import { deleteStoredPdf } from "@/lib/pdf/pdfStorage";

type FileRef = { url?: string | null };

function pdfPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/api\/files\/pdf\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Remove submission attachments from S3 / local / Mongo. */
export async function deleteSubmissionFiles(files: FileRef[]): Promise<void> {
  for (const file of files) {
    const url = (file.url || "").trim();
    if (!url) continue;

    const pdfId = pdfPublicIdFromUrl(url);
    if (pdfId) {
      try {
        await deleteStoredPdf(pdfId);
      } catch (error) {
        console.warn("deleteSubmissionFiles pdf failed:", pdfId, error);
      }
      continue;
    }

    try {
      await deleteUploadByUrl(url);
    } catch (error) {
      console.warn("deleteSubmissionFiles upload failed:", url, error);
    }
  }
}
