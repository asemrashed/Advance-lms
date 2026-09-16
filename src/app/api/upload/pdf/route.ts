import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  apiPdfUrl,
  deleteStoredPdf,
  persistPdfBuffer,
  readPdfBuffer,
} from "@/lib/pdf/pdfStorage";

const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "file is required" }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "Only PDF files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "File size too large. Maximum size is 50MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await persistPdfBuffer(buffer, {
      fileName: file.name,
      uploadedBy: auth.user.id,
    });

    return NextResponse.json({
      success: true,
      pdf: {
        publicId: stored.publicId,
        url: stored.url,
        secureUrl: stored.url,
        fileName: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.user.id,
        folder: String(formData.get("folder") || "lms/documents"),
        description: String(formData.get("description") || ""),
      },
    });
  } catch (error) {
    console.error("Upload PDF POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload PDF" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;
    const publicId = request.nextUrl.searchParams.get("publicId") || "";
    if (!publicId) {
      return NextResponse.json({ success: false, error: "publicId is required" }, { status: 400 });
    }
    const buffer = await readPdfBuffer(publicId);
    if (!buffer) {
      return NextResponse.json({ success: false, error: "PDF not found" }, { status: 404 });
    }
    const url = apiPdfUrl(publicId);
    return NextResponse.json({
      success: true,
      pdf: {
        publicId,
        url,
        secureUrl: url,
        fileName: `${publicId}.pdf`,
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.user.id,
        folder: "lms/documents",
        description: "",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "PDF not found" }, { status: 404 });
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
    await deleteStoredPdf(publicId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "PDF not found" }, { status: 404 });
  }
}
