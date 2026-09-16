import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import PlatformQuestion from "@/models/PlatformQuestion";
import { isObjectId, requireSessionUser } from "@/app/api/_lib/phase12";
import {
  canMutatePlatformQuestion,
  serializePlatformQuestion,
} from "@/app/api/_lib/platformQuestions";

const BASE_DIR = path.join(process.cwd(), "public", "uploads", "pp-diagrams");
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function extensionFor(type: string) {
  if (type === "image/jpeg" || type === "image/jpg") return ".jpg";
  if (type === "image/webp") return ".webp";
  return ".png";
}

interface RouteCtx {
  params: Promise<{ id: string }>;
}

/**
 * Attach (or replace) a diagram PNG crop for a past-paper question.
 * `target` = "qp" (question diagram, default) or "ms" (mark-scheme diagram).
 * Recomputes the question's completeness status via the model pre-save hook.
 */
export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid question id" },
        { status: 400 },
      );
    }

    const { ok } = await canMutatePlatformQuestion(auth.user, id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const target = String(formData.get("target") || "qp").toLowerCase();
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "file is required" },
        { status: 400 },
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only PNG/JPG/WEBP images are allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "Image too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    await mkdir(BASE_DIR, { recursive: true });
    const publicId = `${Date.now()}-${randomUUID()}`;
    const fileName = `${publicId}${extensionFor(file.type)}`;
    await writeFile(
      path.join(BASE_DIR, fileName),
      Buffer.from(await file.arrayBuffer()),
    );
    const url = `/uploads/pp-diagrams/${fileName}`;

    const q = await PlatformQuestion.findById(id);
    if (!q) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 },
      );
    }

    if (target === "ms") {
      q.hasMsDiagram = true;
      q.msDiagramUrl = url;
      q.msDiagramStatus = "uploaded";
    } else {
      q.hasDiagram = true;
      q.diagramUrl = url;
      q.diagramStatus = "uploaded";
    }
    // Ensure completeness recompute treats this as a past-paper question.
    if (q.sourceType !== "pastpaper") q.sourceType = "pastpaper";

    await q.save();

    return NextResponse.json({
      success: true,
      data: {
        url,
        target: target === "ms" ? "ms" : "qp",
        question: serializePlatformQuestion(
          q.toObject() as Record<string, unknown>,
        ),
      },
    });
  } catch (error) {
    console.error("Platform question diagram PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload diagram" },
      { status: 500 },
    );
  }
}
