import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  listTestYourselfQuestions,
  resolveTestYourselfAccess,
} from "@/app/api/_lib/testYourself";
import type { TestYourselfAttemptMode } from "@/types/testYourself";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    const access = await resolveTestYourselfAccess(
      session?.user?.id,
      session?.user?.role,
    );

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject")?.trim();
    const modeRaw = (searchParams.get("mode") || "full").trim().toLowerCase();
    const mode: TestYourselfAttemptMode =
      modeRaw === "topic" ? "topic" : "full";
    const topic = searchParams.get("topic")?.trim() || undefined;
    const difficultyRaw = searchParams.get("difficulty")?.trim() || "all";
    const difficulty =
      difficultyRaw === "1" || difficultyRaw === "2" || difficultyRaw === "3"
        ? Number(difficultyRaw)
        : ("all" as const);

    // Legacy: subject+topic without mode → topic mode
    const legacyTopic = !searchParams.has("mode") && topic ? topic : undefined;
    const resolvedMode: TestYourselfAttemptMode = legacyTopic
      ? "topic"
      : mode;
    const resolvedTopic =
      resolvedMode === "topic" ? topic || legacyTopic : undefined;

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "subject is required" },
        { status: 400 },
      );
    }

    if (resolvedMode === "topic" && !resolvedTopic) {
      return NextResponse.json(
        { success: false, error: "topic is required for topic-wise mode" },
        { status: 400 },
      );
    }

    const payload = await listTestYourselfQuestions(access, subject, {
      mode: resolvedMode,
      topic: resolvedTopic,
      difficulty,
    });

    if (payload.error) {
      return NextResponse.json(
        { success: false, error: payload.error },
        { status: 400 },
      );
    }

    if (!payload.questions.length) {
      return NextResponse.json(
        { success: false, error: "No questions found for this selection" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        subject,
        topic: resolvedTopic || null,
        mode: resolvedMode,
        difficulty: difficulty === "all" ? null : difficulty,
        questions: payload.questions,
        access: {
          fullAccess: access.fullAccess,
          freeLimit: payload.freeLimit,
          enrolledLimit: payload.enrolledLimit,
          sampleSize: payload.sampleSize,
          poolSize: payload.poolSize,
          total: payload.poolSize,
          lockedCount: access.fullAccess
            ? 0
            : Math.max(0, payload.poolSize - payload.freeLimit),
        },
      },
    });
  } catch (error) {
    console.error("Public test-yourself questions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
