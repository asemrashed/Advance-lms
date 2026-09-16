import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import User from "@/models/User";
import { deleteUploadFiles, persistUploadFile } from "@/lib/mediaStorage";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);

function extensionFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/gif") return ".gif";
  if (type === "image/webp") return ".webp";
  return ".jpg";
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;
    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "avatar file is required" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid image type" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    const publicId = `${Date.now()}-${randomUUID()}`;
    const ext = extensionFor(file.type);
    const fileName = `${publicId}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await persistUploadFile({
      folder: "avatars",
      fileName,
      buffer,
      contentType: file.type || "image/jpeg",
    });

    await User.findByIdAndUpdate(auth.user.id, { avatar: stored.url });

    return NextResponse.json({
      success: true,
      imageUrl: stored.url,
      publicId,
      message: "Avatar uploaded successfully",
    });
  } catch (error) {
    console.error("Upload avatar POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload avatar" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;
    const publicId = request.nextUrl.searchParams.get("publicId") || "";
    if (!publicId) {
      return NextResponse.json({ success: false, error: "publicId is required" }, { status: 400 });
    }

    const deleted = await deleteUploadFiles("avatars", publicId, [
      ".jpg",
      ".png",
      ".gif",
      ".webp",
    ]);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Avatar not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Avatar deleted successfully" });
  } catch (error) {
    console.error("Upload avatar DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete avatar" }, { status: 500 });
  }
}
