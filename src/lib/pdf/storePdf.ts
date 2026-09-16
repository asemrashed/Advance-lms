import { persistPdfBuffer as persist } from "@/lib/pdf/pdfStorage";

export { apiPdfUrl as pdfPublicUrl } from "@/lib/pdf/pdfStorage";

export async function persistPdfBuffer(buffer: Buffer) {
  return persist(buffer);
}
