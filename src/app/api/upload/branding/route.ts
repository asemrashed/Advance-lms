import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { persistUploadFile } from "@/lib/mediaStorage";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

function extensionFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/gif") return ".gif";
  if (type === "image/webp") return ".webp";
  if (type.includes("icon")) return ".ico";
  return ".jpg";
}

/** Admin CMS branding assets (logo, favicon). */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["super_admin"]);
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "file is required" },
        { status: 400 },
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid image type" },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    const publicId = `${Date.now()}-${randomUUID()}`;
    const ext = extensionFor(file.type);
    const fileName = `${publicId}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await persistUploadFile({
      folder: "branding",
      fileName,
      buffer,
      contentType: file.type || "image/jpeg",
    });

    return NextResponse.json({
      success: true,
      imageUrl: stored.url,
      publicId,
      message: "Branding asset uploaded successfully",
    });
  } catch (error) {
    console.error("Upload branding POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload branding asset" },
      { status: 500 },
    );
  }
}
