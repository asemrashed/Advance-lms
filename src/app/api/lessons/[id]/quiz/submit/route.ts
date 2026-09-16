import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Lesson from "@/models/Lesson";
import Question from "@/models/Question";
import { ensureStudentCourseAccess } from "@/app/api/_lib/studentEnrollment";
import LessonQuizResult from "@/models/LessonQuizResult";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PASSING_SCORE_THRESHOLD = 60;

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (role !== "student") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid lesson ID" },
        { status: 400 },
      );
    }

    const lesson = await Lesson.findById(id).lean();
    if (!lesson) {
      return NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    if (!lesson.isPublished) {
      return NextResponse.json(
        { success: false, error: "Lesson is not available" },
        { status: 403 },
      );
    }

    const access = await ensureStudentCourseAccess(userId, String(lesson.course));
    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const body = (await request.json()) as {
      startedAt?: string;
      answers?: Array<{ questionId: string; selectedIndex: number }>;
      isPracticeMode?: boolean;
    };

    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return NextResponse.json(
        { success: false, error: "answers are required" },
        { status: 400 },
      );
    }

    const isPracticeMode = Boolean(body.isPracticeMode);
    if (!isPracticeMode) {
      const existing = await LessonQuizResult.findOne({
        user: userId,
        lesson: id,
        isPracticeMode: false,
      })
        .select("_id")
        .lean();
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Quiz has already been submitted for this lesson",
          },
          { status: 400 },
        );
      }
    }

    const questionIds = body.answers.map((a) => a.questionId);
    const uniqueIds = new Set(questionIds);
    if (uniqueIds.size !== questionIds.length) {
      return NextResponse.json(
        { success: false, error: "Duplicate question IDs in answers" },
        { status: 400 },
      );
    }

    const lessonOid = new mongoose.Types.ObjectId(id);
    const questions = await Question.find({
      _id: { $in: questionIds },
      lesson: lessonOid,
      isActive: true,
    }).lean();

    if (questions.length !== body.answers.length) {
      return NextResponse.json(
        { success: false, error: "Invalid answers submitted" },
        { status: 400 },
      );
    }

    const questionMap = new Map(questions.map((q) => [String(q._id), q]));

    let correct = 0;
    const evaluated = body.answers.map((a) => {
      const q = questionMap.get(a.questionId) as {
        options?: { text?: string; isCorrect?: boolean }[];
      } | undefined;
      const opts = q?.options || [];
      const correctIdx = opts.findIndex((o) => o.isCorrect);
      const selected = Number(a.selectedIndex);
      const isCorrect =
        correctIdx >= 0 &&
        Number.isFinite(selected) &&
        selected === correctIdx;
      if (isCorrect) correct += 1;
      return {
        questionId: a.questionId,
        selectedIndex: selected,
        isCorrect: !!isCorrect,
      };
    });

    const totalQuestions = body.answers.length;
    const scorePercentage =
      totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const passing = scorePercentage >= PASSING_SCORE_THRESHOLD;

    const result = await LessonQuizResult.create({
      user: new mongoose.Types.ObjectId(userId),
      course: lesson.course as mongoose.Types.ObjectId,
      lesson: lessonOid,
      totalQuestions,
      correctAnswers: correct,
      scorePercentage,
      answers: evaluated,
      isPracticeMode,
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      submittedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: String(result._id),
        score: scorePercentage,
        passing,
        totalQuestions,
        correctAnswers: correct,
        scorePercentage,
        answers: evaluated,
        isPracticeMode,
      },
    });
  } catch (error) {
    console.error("Lesson quiz submit error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit quiz" },
      { status: 500 },
    );
  }
}
