import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import connectDB from "@/lib/mongodb";
import UploadedPdf from "@/models/UploadedPdf";
import { useLocalDisk } from "@/lib/mediaStorage";
import {
  deleteObject,
  getObjectBuffer,
  isS3Configured,
  putObject,
  s3PdfKey,
} from "@/lib/s3";

const BASE_DIR = path.join(process.cwd(), "public", "uploads", "pdf");

function toNodeBuffer(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data && typeof data === "object") {
    const maybe = data as { type?: unknown; data?: unknown };
    if (maybe.type === "Buffer" && Array.isArray(maybe.data)) {
      return Buffer.from(maybe.data as number[]);
    }
  }
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  throw new Error("Unsupported PDF binary payload");
}

export function localPdfPath(publicId: string) {
  return path.join(BASE_DIR, `${publicId}.pdf`);
}

export function localPdfUrl(publicId: string) {
  return `/uploads/pdf/${publicId}.pdf`;
}

/** App-served URL that reads from S3 / Mongo (works across hosts sharing the DB). */
export function apiPdfUrl(publicId: string) {
  return `/api/files/pdf/${encodeURIComponent(publicId)}`;
}

export async function writeLocalPdf(publicId: string, buffer: Buffer) {
  if (!useLocalDisk()) return;
  await mkdir(BASE_DIR, { recursive: true });
  await writeFile(localPdfPath(publicId), buffer);
}

export async function savePdfToDatabase(
  publicId: string,
  buffer: Buffer,
  options?: { fileName?: string; uploadedBy?: string },
) {
  await connectDB();
  const update: Record<string, unknown> = {
    publicId,
    data: buffer,
    size: buffer.length,
  };
  if (options?.fileName) update.fileName = options.fileName;
  if (options?.uploadedBy) update.uploadedBy = options.uploadedBy;

  await UploadedPdf.findOneAndUpdate({ publicId }, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  });
}

async function uploadPdfBufferToS3(buffer: Buffer, publicId: string) {
  const key = s3PdfKey(publicId);
  return putObject({
    key,
    body: buffer,
    contentType: "application/pdf",
    cacheControl: "private, max-age=86400",
  });
}

/**
 * Persist PDF bytes. When S3 is configured, stores only on S3 (+ optional Mongo backup).
 * Local disk is used only when S3 is not configured (dev).
 */
export async function persistPdfBuffer(
  buffer: Buffer,
  options?: { fileName?: string; uploadedBy?: string },
) {
  const publicId = `${Date.now()}-${randomUUID()}`;

  if (isS3Configured()) {
    await uploadPdfBufferToS3(buffer, publicId);
    void savePdfToDatabase(publicId, buffer, options).catch((error) => {
      console.error("Mongo PDF persist failed:", error);
    });
  } else {
    await writeLocalPdf(publicId, buffer);
    void savePdfToDatabase(publicId, buffer, options).catch((error) => {
      console.error("Mongo PDF persist failed:", error);
    });
  }

  return { publicId, url: apiPdfUrl(publicId) };
}

export async function readPdfBuffer(publicId: string): Promise<Buffer | null> {
  if (isS3Configured()) {
    try {
      const buffer = await getObjectBuffer(s3PdfKey(publicId));
      if (buffer) return buffer;
    } catch (error) {
      console.error("S3 PDF read failed:", error);
    }
  } else {
    try {
      return await readFile(localPdfPath(publicId));
    } catch {
      // fall through
    }
  }

  try {
    await connectDB();
    const row = await UploadedPdf.findOne({ publicId }).select("data").lean();
    if (row?.data) {
      return toNodeBuffer(row.data);
    }
  } catch (error) {
    console.error("Mongo PDF read failed:", error);
  }

  if (!isS3Configured()) {
    try {
      const buffer = await getObjectBuffer(s3PdfKey(publicId));
      if (buffer) return buffer;
    } catch (error) {
      console.error("S3 PDF read failed:", error);
    }
  }

  return null;
}

export async function deleteStoredPdf(publicId: string) {
  if (isS3Configured()) {
    await deleteObject(s3PdfKey(publicId));
  }
  if (useLocalDisk()) {
    try {
      await unlink(localPdfPath(publicId));
    } catch {
      // ignore missing local file
    }
  }
  try {
    await connectDB();
    await UploadedPdf.deleteOne({ publicId });
  } catch (error) {
    console.error("Mongo PDF delete failed:", error);
  }
}
