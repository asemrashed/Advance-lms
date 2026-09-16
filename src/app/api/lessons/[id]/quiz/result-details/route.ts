import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import LessonQuizResult from "@/models/LessonQuizResult";
import Question from "@/models/Question";
import {
  correctOptionIndexFromQuestion,
  optionsToStrings,
  toObjectId,
} from "@/app/api/_lib/lessonQuiz";

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

    const latestSubmission = await LessonQuizResult.findOne({
      lesson: lessonId,
      user: userOid,
      isPracticeMode: { $ne: true },
    })
      .sort({ submittedAt: -1 })
      .lean();

    if (!latestSubmission) {
      return NextResponse.json(
        { success: false, error: "No submitted quiz found for this lesson" },
        { status: 404 },
      );
    }

    type AnswerRow = {
      questionId: string;
      selectedIndex: number;
      isCorrect: boolean;
    };
    const answers: AnswerRow[] = Array.isArray(latestSubmission.answers)
      ? (latestSubmission.answers as AnswerRow[])
      : [];
    const questionIds = answers
      .map((a) => a.questionId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const questions = await Question.find({
      _id: { $in: questionIds },
      lesson: lessonId,
    })
      .select("question options explanation")
      .lean();

    const questionMap = new Map(
      questions.map((q) => [String(q._id), q as Record<string, unknown>]),
    );

    const detailedQuestions = answers.map((a, index) => {
      const questionId = String(a.questionId);
      const q = questionMap.get(questionId);
      const opts = optionsToStrings(
        (q?.options as { text?: string }[] | undefined) ?? [],
      );
      const correctIdx = q ? correctOptionIndexFromQuestion(q as { options?: { isCorrect?: boolean }[] }) : -1;

      return {
        order: index + 1,
        questionId,
        question: (q?.question as string) || "Question unavailable",
        options: opts,
        selectedIndex: Number(a.selectedIndex),
        correctOptionIndex: correctIdx,
        isCorrect: Boolean(a.isCorrect),
        explanation: (q?.explanation as string) || "",
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        submissionId: String(latestSubmission._id),
        submittedAt:
          latestSubmission.submittedAt instanceof Date
            ? latestSubmission.submittedAt.toISOString()
            : latestSubmission.submittedAt,
        scorePercentage: Number(latestSubmission.scorePercentage ?? 0),
        correctAnswers: Number(latestSubmission.correctAnswers ?? 0),
        totalQuestions: Number(latestSubmission.totalQuestions ?? 0),
        questions: detailedQuestions,
      },
    });
  } catch (error) {
    console.error("Lesson quiz result details error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch quiz result details" },
      { status: 500 },
    );
  }
}
