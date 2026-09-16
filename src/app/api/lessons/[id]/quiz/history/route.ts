import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import LessonQuizResult from "@/models/LessonQuizResult";
import { serializeQuizResultRow, toObjectId } from "@/app/api/_lib/lessonQuiz";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
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
    const { id: lessonId } = await params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lesson ID" },
        { status: 400 },
      );
    }

    const results = await LessonQuizResult.find({
      lesson: lessonId,
      user: userOid,
    })
      .sort({ submittedAt: -1 })
      .select("scorePercentage correctAnswers totalQuestions isPracticeMode submittedAt")
      .lean();

    return NextResponse.json({
      success: true,
      data: results.map((row) =>
        serializeQuizResultRow(row as Record<string, unknown>),
      ),
    });
  } catch (error) {
    console.error("Lesson quiz history error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch submission history" },
      { status: 500 },
    );
  }
}
