import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { persistUploadFile } from "@/lib/mediaStorage";
import { isS3Configured, putObject, s3CourseImageKey } from "@/lib/s3";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/** Course thumbnail — admin or instructor. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicId = `${Date.now()}-${randomUUID()}`;
    const ext = extensionFor(file.type);
    const fileName = `${publicId}.${ext}`;

    let imageUrl: string;
    if (isS3Configured()) {
      const key = s3CourseImageKey(publicId, ext);
      const remote = await putObject({
        key,
        body: buffer,
        contentType: file.type || `image/${ext}`,
        cacheControl: "public, max-age=31536000, immutable",
      });
      imageUrl = remote.url;
    } else {
      const stored = await persistUploadFile({
        folder: "courses",
        fileName,
        buffer,
        contentType: file.type || `image/${ext}`,
      });
      imageUrl = stored.url;
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      data: { imageUrl, url: imageUrl },
    });
  } catch (error) {
    console.error("POST /api/upload/course-thumbnail", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
