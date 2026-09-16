import { NextRequest, NextResponse } from "next/server";
import PlatformQuestion from "@/models/PlatformQuestion";
import { isObjectId, requireSessionUser } from "@/app/api/_lib/phase12";
import {
  canMutatePlatformQuestion,
  serializePlatformQuestion,
} from "@/app/api/_lib/platformQuestions";
import {
  PLATFORM_QUESTION_AI_MODEL,
  callClaudeForMcqConversion,
} from "@/app/api/_lib/platformQuestionGenerate";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function anthropicKeyMissingResponse() {
  return NextResponse.json(
    {
      success: false,
      error:
        "AI conversion is not configured. Add ANTHROPIC_API_KEY to .env.local.",
      code: "ANTHROPIC_API_KEY_MISSING",
    },
    { status: 503 },
  );
}

export async function POST(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin"]);
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

    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return anthropicKeyMissingResponse();
    }

    const q = await PlatformQuestion.findById(id);
    if (!q) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 },
      );
    }

    const converted = await callClaudeForMcqConversion({
      questionText: q.questionText,
      answerText: q.answerText,
      msText: q.msText,
      explanation: q.explanation,
      subject: q.subject,
      topic: q.topic,
    });

    q.options = converted.options;
    q.questionFormat = "mcq";
    q.answerText = converted.answerText || q.answerText;
    q.explanation = converted.explanation || q.explanation || q.msText;
    q.aiGenerated = true;
    q.aiModel = q.aiModel || PLATFORM_QUESTION_AI_MODEL;
    await q.save();

    return NextResponse.json({
      success: true,
      data: serializePlatformQuestion(q.toObject() as Record<string, unknown>),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "CONVERT_FAILED";
    if (msg === "ANTHROPIC_API_KEY_NOT_CONFIGURED") {
      return anthropicKeyMissingResponse();
    }
    if (msg === "ANTHROPIC_PARSE_ERROR") {
      return NextResponse.json(
        { success: false, error: "Could not parse AI response as MCQ options" },
        { status: 502 },
      );
    }
    if (msg.startsWith("ANTHROPIC_API_ERROR")) {
      console.error("Convert question to MCQ API error:", msg);
      return NextResponse.json(
        { success: false, error: "Claude API request failed" },
        { status: 502 },
      );
    }
    console.error("Convert question to MCQ error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to convert question to MCQ" },
      { status: 500 },
    );
  }
}
