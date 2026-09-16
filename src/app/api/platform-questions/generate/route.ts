import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  callClaudeForQuestionExtraction,
  saveGeneratedPlatformQuestions,
  type GeneratedPlatformQuestionDraft,
} from "@/app/api/_lib/platformQuestionGenerate";
import {
  enrichSubjectFields,
  buildSubjectFieldsFromBody,
} from "@/app/api/_lib/subjects";
import { extractTextFromUploadedPdf } from "@/lib/pdf/extractPdfText";
import Subject from "@/models/Subject";
import { normalizeSubjectChapters } from "@/lib/subjectChapters";

function anthropicKeyMissingResponse() {
  return NextResponse.json(
    {
      success: false,
      error:
        "AI generation is not configured. Add ANTHROPIC_API_KEY to .env.local (see .env.example).",
      code: "ANTHROPIC_API_KEY_MISSING",
    },
    { status: 503 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;

    if (body.save === true) {
      const questions = body.questions;
      if (!Array.isArray(questions) || !questions.length) {
        return NextResponse.json(
          { success: false, error: "questions array is required to save" },
          { status: 400 },
        );
      }
      const subjectFields = await enrichSubjectFields(buildSubjectFieldsFromBody(body));
      const componentId = body.componentId ? String(body.componentId) : undefined;
      const { resolveSubjectComponent } = await import("@/app/api/_lib/subjects");
      if (!componentId) {
        return NextResponse.json(
          { success: false, error: "Exam component is required" },
          { status: 400 },
        );
      }
      const resolved = await resolveSubjectComponent({
        subjectId: subjectFields.subjectId,
        subjectName: subjectFields.subjectName || (body.subject ? String(body.subject) : undefined),
        subjectCode: subjectFields.subjectCode,
        componentId,
      });
      if ("error" in resolved) {
        return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
      }
      const saved = await saveGeneratedPlatformQuestions(
        auth.user,
        questions as GeneratedPlatformQuestionDraft[],
        {
          subject: subjectFields.subjectName || (body.subject ? String(body.subject) : undefined),
          subjectId: subjectFields.subjectId,
          subjectCode: subjectFields.subjectCode,
          grade: subjectFields.grade,
          topic: body.topic ? String(body.topic) : undefined,
          componentId: resolved.component._id,
          componentName: resolved.component.name,
          componentType: resolved.component.type,
          accessPolicy: body.accessPolicy ? String(body.accessPolicy) : undefined,
          sourceType: body.sourceType === "pdf" ? "pdf" : "claude",
          sourcePdfPublicId: body.sourcePdfPublicId
            ? String(body.sourcePdfPublicId)
            : undefined,
          sourcePdfUrl: body.sourcePdfUrl ? String(body.sourcePdfUrl) : undefined,
        },
      );
      return NextResponse.json({
        success: true,
        data: { saved, count: saved.length },
      });
    }

    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return anthropicKeyMissingResponse();
    }

    const subjectFields = await enrichSubjectFields(buildSubjectFieldsFromBody(body));
    if (!subjectFields.subjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "Select a subject first. Topics come from that subject's chapters.",
          code: "SUBJECT_REQUIRED",
        },
        { status: 400 },
      );
    }
    const subjectDoc = await Subject.findById(subjectFields.subjectId).lean();
    const allowedTopics = normalizeSubjectChapters(
      (subjectDoc as { chapters?: unknown } | null)?.chapters,
    ).map((c) => c.name);
    if (!allowedTopics.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This subject has no chapters. Add chapters under Admin → Subjects before generating questions.",
          code: "SUBJECT_CHAPTERS_REQUIRED",
        },
        { status: 400 },
      );
    }

    const componentId = body.componentId ? String(body.componentId) : "";
    if (!componentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Select an exam component before generating questions.",
          code: "COMPONENT_REQUIRED",
        },
        { status: 400 },
      );
    }
    const { resolveSubjectComponent } = await import("@/app/api/_lib/subjects");
    const resolved = await resolveSubjectComponent({
      subjectId: subjectFields.subjectId,
      subjectName: subjectFields.subjectName,
      subjectCode: subjectFields.subjectCode,
      componentId,
    });
    if ("error" in resolved) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
    }

    const hints = {
      subject: subjectFields.subjectName || (body.subject ? String(body.subject) : undefined),
      topic: body.topic ? String(body.topic) : undefined,
      allowedTopics,
      questionFormat: resolved.component.type,
    };

    let text = String(body.text || "").trim();
    let pdfSource: { publicId: string; url: string } | undefined;

    const pdfPublicId = String(body.pdfPublicId || "").trim();
    if (pdfPublicId) {
      try {
        const extracted = await extractTextFromUploadedPdf(pdfPublicId);
        text = extracted.text;
        pdfSource = { publicId: extracted.publicId, url: extracted.url };
      } catch (err) {
        const code = err instanceof Error ? err.message : "PDF_EXTRACT_FAILED";
        if (code === "INVALID_PDF_PUBLIC_ID") {
          return NextResponse.json({ success: false, error: "Invalid PDF id" }, { status: 400 });
        }
        if (code === "PDF_NOT_FOUND") {
          return NextResponse.json({ success: false, error: "PDF not found" }, { status: 404 });
        }
        if (code === "PDF_TEXT_TOO_SHORT") {
          return NextResponse.json(
            { success: false, error: "Could not extract enough text from PDF (try a text-based PDF)" },
            { status: 422 },
          );
        }
        console.error("PDF extract error:", err);
        return NextResponse.json(
          { success: false, error: "Failed to extract text from PDF" },
          { status: 500 },
        );
      }
    }

    if (text.length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: pdfPublicId
            ? "PDF produced insufficient text for generation"
            : "Paste at least 50 characters of source text",
        },
        { status: 400 },
      );
    }

    let questions = await callClaudeForQuestionExtraction(text, {
      ...hints,
      fromPdf: Boolean(pdfSource),
    });

    if (pdfSource) {
      questions = questions.map((q) => ({
        ...q,
        diagramUrl:
          q.hasDiagram && !q.diagramUrl ? pdfSource!.url : q.diagramUrl,
      }));
    }

    if (!questions.length) {
      return NextResponse.json(
        { success: false, error: "No valid questions could be extracted from the source" },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        questions,
        preview: true,
        source: pdfSource
          ? { type: "pdf", pdfPublicId: pdfSource.publicId, pdfUrl: pdfSource.url }
          : { type: "text" },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "GENERATION_FAILED";
    if (msg === "ANTHROPIC_API_KEY_NOT_CONFIGURED") {
      return anthropicKeyMissingResponse();
    }
    if (msg === "ANTHROPIC_PARSE_ERROR") {
      return NextResponse.json(
        { success: false, error: "Could not parse AI response as JSON" },
        { status: 502 },
      );
    }
    if (msg.startsWith("ANTHROPIC_API_ERROR")) {
      console.error("Platform questions generate API error:", msg);
      return NextResponse.json(
        { success: false, error: "Claude API request failed" },
        { status: 502 },
      );
    }
    console.error("Platform questions generate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate questions" },
      { status: 500 },
    );
  }
}
