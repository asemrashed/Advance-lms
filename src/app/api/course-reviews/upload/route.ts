import { NextResponse } from "next/server";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { persistUploadFile } from "@/lib/mediaStorage";

const MAX_SIZE = 100 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get("video");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "video file is required" }, { status: 400 });
    }
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ success: false, error: "Only video files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size too large. Maximum size is 100MB" },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name) || ".mp4";
    const publicId = `${Date.now()}-${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await persistUploadFile({
      folder: "review-videos",
      fileName: publicId,
      buffer,
      contentType: file.type || "video/mp4",
    });

    return NextResponse.json({
      success: true,
      data: {
        videoUrl: stored.url,
        videoThumbnail: "",
      },
    });
  } catch (error) {
    console.error("course-reviews upload error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload video" }, { status: 500 });
  }
}
