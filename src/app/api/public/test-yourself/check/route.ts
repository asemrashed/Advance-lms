import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  checkTestYourselfAnswers,
  resolveTestYourselfAccess,
} from "@/app/api/_lib/testYourself";
import type { TestYourselfAttemptMode } from "@/types/testYourself";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    const access = await resolveTestYourselfAccess(
      session?.user?.id,
      session?.user?.role,
    );

    const body = (await request.json()) as Record<string, unknown>;
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const modeRaw = typeof body.mode === "string" ? body.mode.trim() : "full";
    const mode: TestYourselfAttemptMode =
      modeRaw === "topic" ? "topic" : "full";
    const topic =
      typeof body.topic === "string" ? body.topic.trim() : undefined;
    const difficulty =
      body.difficulty != null && [1, 2, 3].includes(Number(body.difficulty))
        ? Number(body.difficulty)
        : undefined;

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "subject is required" },
        { status: 400 },
      );
    }

    if (mode === "topic" && !topic) {
      return NextResponse.json(
        { success: false, error: "topic is required for topic-wise mode" },
        { status: 400 },
      );
    }

    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];
    const answers = rawAnswers
      .filter(
        (a): a is Record<string, unknown> =>
          typeof a === "object" && a !== null,
      )
      .map((a) => ({
        questionId: String(a.questionId ?? "").trim(),
        optionIndex:
          a.optionIndex == null
            ? undefined
            : Number.parseInt(String(a.optionIndex ?? ""), 10),
        textAnswer:
          typeof a.textAnswer === "string" ? a.textAnswer.trim() : undefined,
      }))
      .filter(
        (a) =>
          a.questionId &&
          (Number.isFinite(a.optionIndex) || Boolean(a.textAnswer)),
      );

    if (!answers.length) {
      return NextResponse.json(
        { success: false, error: "At least one answer is required" },
        { status: 400 },
      );
    }

    const checked = await checkTestYourselfAnswers(access, subject, {
      mode,
      topic,
      difficulty,
      answers,
    });

    if (checked.error || !checked.results) {
      return NextResponse.json(
        { success: false, error: checked.error || "Could not check answers" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        score: checked.score,
        total: checked.total,
        results: checked.results,
        attemptId: checked.attemptId,
      },
    });
  } catch (error) {
    console.error("Public test-yourself check error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
