import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import LessonQuizResult from "@/models/LessonQuizResult";
import { serializeQuizResultRow, toObjectId } from "@/app/api/_lib/lessonQuiz";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userOid = toObjectId(userId);
    if (!userOid) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const latestNonPractice = await LessonQuizResult.findOne({
      user: userOid,
      isPracticeMode: false,
    })
      .sort({ submittedAt: -1 })
      .select("scorePercentage correctAnswers totalQuestions submittedAt isPracticeMode")
      .lean();

    const latestAny = latestNonPractice
      ? null
      : await LessonQuizResult.findOne({ user: userOid })
          .sort({ submittedAt: -1 })
          .select("scorePercentage correctAnswers totalQuestions submittedAt isPracticeMode")
          .lean();

    const latestResult = latestNonPractice || latestAny;
    if (!latestResult) {
      return NextResponse.json({ success: true, data: null });
    }

    const row = serializeQuizResultRow(latestResult as Record<string, unknown>);
    const valid =
      row.totalQuestions > 0 &&
      row.correctAnswers >= 0 &&
      row.correctAnswers <= row.totalQuestions &&
      row.scorePercentage >= 0 &&
      row.scorePercentage <= 100;

    return NextResponse.json({
      success: true,
      data: valid ? row : null,
    });
  } catch (error) {
    console.error("Latest quiz mark error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch latest quiz mark" },
      { status: 500 },
    );
  }
}
