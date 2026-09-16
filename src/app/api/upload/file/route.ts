import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser, type AppRole } from "@/app/api/_lib/phase12";
import { parseManagedUploadUrl } from "@/lib/managedUploadUrl";
import { deleteUploadByUrl } from "@/lib/mediaStorage";

const FOLDER_ROLES: Record<string, AppRole[]> = {
  courses: ["admin", "instructor"],
  batches: ["admin", "instructor"],
  cms: ["super_admin"],
  branding: ["super_admin"],
  avatars: ["admin", "instructor", "student"],
  "payment-proofs": ["admin", "instructor", "student"],
  assignments: ["admin", "instructor", "student"],
  "review-videos": ["admin", "instructor", "student"],
};

/** DELETE ?url= — remove a managed upload from S3 and/or local disk. */
export async function DELETE(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url")?.trim() || "";
    if (!url) {
      return NextResponse.json(
        { success: false, error: "url is required" },
        { status: 400 },
      );
    }

    const parsed = parseManagedUploadUrl(url);
    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: "URL is not a managed upload (external or invalid)",
        },
        { status: 400 },
      );
    }

    const roles = FOLDER_ROLES[parsed.folder];
    if (!roles) {
      return NextResponse.json(
        { success: false, error: "Unsupported upload type" },
        { status: 400 },
      );
    }

    const auth = await requireSessionUser(roles);
    if (auth.error) return auth.error;

    const deleted = await deleteUploadByUrl(url);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/upload/file", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete file" },
      { status: 500 },
    );
  }
}
