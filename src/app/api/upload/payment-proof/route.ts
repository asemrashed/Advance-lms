import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { persistUploadFile } from "@/lib/mediaStorage";
import { isS3Configured, putObject, s3PaymentProofKey } from "@/lib/s3";

const MAX_SIZE = 15 * 1024 * 1024;

const ALLOWED = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function extFromFile(file: File): string | null {
  const byType = ALLOWED.get(file.type);
  if (byType) return byType;
  const lower = file.name.toLowerCase();
  for (const ext of new Set(ALLOWED.values())) {
    if (lower.endsWith(`.${ext}`)) return ext;
  }
  if (lower.endsWith(".jpeg")) return "jpg";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "file is required" },
        { status: 400 },
      );
    }

    const ext = extFromFile(file);
    if (!ext) {
      return NextResponse.json(
        {
          success: false,
          error: "Only PDF or image files (JPG, PNG, WEBP, GIF) are allowed",
        },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size too large. Maximum size is 15MB" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicId = `${Date.now()}-${randomUUID()}`;
    const fileName = `${publicId}.${ext}`;
    const contentType =
      file.type || (ext === "pdf" ? "application/pdf" : `image/${ext}`);

    let url: string;
    if (isS3Configured()) {
      const remote = await putObject({
        key: s3PaymentProofKey(publicId, ext),
        body: buffer,
        contentType,
        cacheControl: "private, max-age=86400",
      });
      url = remote.url;
    } else {
      const stored = await persistUploadFile({
        folder: "payment-proofs",
        fileName,
        buffer,
        contentType,
        cacheControl: "private, max-age=86400",
      });
      url = stored.url;
    }

    return NextResponse.json({
      success: true,
      file: {
        publicId,
        url,
        secureUrl: url,
        fileName: file.name,
        size: file.size,
        type: ext === "pdf" ? "pdf" : "image",
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.user.id,
      },
    });
  } catch (error) {
    console.error("Upload payment-proof POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload proof" },
      { status: 500 },
    );
  }
}
