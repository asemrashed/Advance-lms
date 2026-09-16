import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { isPdfSubmissionFile } from "@/lib/assignments/validation";
import {
  apiUploadUrl,
  persistUploadFile,
} from "@/lib/mediaStorage";
import { persistPdfBuffer } from "@/lib/pdf/pdfStorage";

const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["student", "instructor", "admin"]);
    if (auth.error) return auth.error;

    const form = await request.formData();
    const filesInput = form.getAll("files");
    const files = filesInput.filter((x): x is File => x instanceof File);
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 },
      );
    }

    const assignmentType = String(form.get("assignmentType") || "").trim();
    const saved = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: `${file.name} exceeds max 50MB` },
          { status: 400 },
        );
      }
      if (
        (assignmentType === "pdf" || assignmentType === "file_upload") &&
        auth.user.role === "student" &&
        !isPdfSubmissionFile({ name: file.name, type: file.type })
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Only PDF files are allowed for this assignment",
          },
          { status: 400 },
        );
      }

      const ext = path.extname(file.name) || "";
      const bytes = Buffer.from(await file.arrayBuffer());
      const isPdf =
        isPdfSubmissionFile({ name: file.name, type: file.type }) ||
        ext.toLowerCase() === ".pdf" ||
        file.type === "application/pdf";

      if (isPdf) {
        const stored = await persistPdfBuffer(bytes, {
          fileName: file.name,
          uploadedBy: auth.user.id,
        });
        saved.push({
          name: file.name,
          url: stored.url,
          type: file.type || "application/pdf",
          size: file.size,
        });
        continue;
      }

      const cleanName = `${Date.now()}-${randomUUID()}${ext}`;
      await persistUploadFile({
        folder: "assignments",
        fileName: cleanName,
        buffer: bytes,
        contentType: file.type || "application/octet-stream",
        cacheControl: "private, max-age=86400",
      });
      saved.push({
        name: file.name,
        url: apiUploadUrl(`assignments/${cleanName}`),
        type: file.type || "application/octet-stream",
        size: file.size,
      });
    }

    return NextResponse.json({ success: true, files: saved });
  } catch (error) {
    console.error("Assignment uploads POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload files" },
      { status: 500 },
    );
  }
}
