import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  extractPastPaperQuestions,
  savePastPaperQuestions,
} from "@/app/api/_lib/pastPaperExtract";
import type { PastPaperQuestionDraft } from "@/lib/pastPaperQuestion";

function anthropicKeyMissingResponse() {
  return NextResponse.json(
    {
      success: false,
      error:
        "AI processing is not configured. Add ANTHROPIC_API_KEY to .env.local (see .env.example).",
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

    // ---- Save step: persist admin-edited questions into the bank ----
    if (body.save === true) {
      const questions = body.questions;
      if (!Array.isArray(questions) || !questions.length) {
        return NextResponse.json(
          { success: false, error: "questions array is required to save" },
          { status: 400 },
        );
      }
      const result = await savePastPaperQuestions(
        auth.user,
        questions as PastPaperQuestionDraft[],
        {
          qpFileId: body.qpPublicId ? String(body.qpPublicId) : undefined,
          msFileId: body.msPublicId ? String(body.msPublicId) : undefined,
          accessPolicy: body.accessPolicy ? String(body.accessPolicy) : undefined,
        },
      );
      return NextResponse.json({ success: true, data: result });
    }

    // ---- Preview step: run Claude vision over the QP + MS pair ----
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return anthropicKeyMissingResponse();
    }

    const qpPublicId = String(body.qpPublicId || "").trim();
    const msPublicId = String(body.msPublicId || "").trim();
    if (!qpPublicId || !msPublicId) {
      return NextResponse.json(
        { success: false, error: "qpPublicId and msPublicId are required" },
        { status: 400 },
      );
    }

    const result = await extractPastPaperQuestions({
      qpPublicId,
      msPublicId,
      paperCode: body.paperCode ? String(body.paperCode) : undefined,
      qpFilename: body.qpFilename ? String(body.qpFilename) : undefined,
      subjectId: body.subjectId ? String(body.subjectId) : undefined,
      subjectCode: body.subjectCode ? String(body.subjectCode) : undefined,
      subjectName: body.subjectName ? String(body.subjectName) : undefined,
      grade: body.grade ? String(body.grade) : undefined,
      user: auth.user,
    });

    if (!result.questions.length) {
      return NextResponse.json(
        {
          success: false,
          error: "No questions could be extracted from the QP + MS pair",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        preview: true,
        questions: result.questions,
        meta: result.meta,
        source: {
          qpPublicId,
          msPublicId,
          qpUrl: result.qpUrl,
          msUrl: result.msUrl,
        },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "PROCESS_FAILED";
    if (msg === "ANTHROPIC_API_KEY_NOT_CONFIGURED") {
      return anthropicKeyMissingResponse();
    }
    if (msg === "ANTHROPIC_PARSE_ERROR") {
      return NextResponse.json(
        { success: false, error: "Could not parse AI response as JSON" },
        { status: 502 },
      );
    }
    if (msg === "ANTHROPIC_PARSE_TRUNCATED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI output was cut off (paper too long). Try processing one section at a time or use a shorter paper.",
          code: "ANTHROPIC_PARSE_TRUNCATED",
        },
        { status: 502 },
      );
    }
    if (msg.startsWith("ANTHROPIC_API_ERROR")) {
      console.error("Past-paper process API error:", msg);
      return NextResponse.json(
        { success: false, error: "Claude API request failed" },
        { status: 502 },
      );
    }
    if (msg === "INVALID_PDF_PUBLIC_ID") {
      return NextResponse.json(
        { success: false, error: "Invalid PDF id" },
        { status: 400 },
      );
    }
    if (msg === "PDF_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "QP or MS PDF not found" },
        { status: 404 },
      );
    }
    if (msg === "SUBJECT_REQUIRED") {
      return NextResponse.json(
        {
          success: false,
          error: "Select a subject before processing. Topics come from that subject's chapters.",
          code: "SUBJECT_REQUIRED",
        },
        { status: 400 },
      );
    }
    if (msg === "SUBJECT_CHAPTERS_REQUIRED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This subject has no chapters. Add chapters under Admin → Subjects first — Haiku will use those as topics.",
          code: "SUBJECT_CHAPTERS_REQUIRED",
        },
        { status: 400 },
      );
    }
    console.error("Past-paper process error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process past paper" },
      { status: 500 },
    );
  }
}
