import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Exam from "@/models/Exam";
import Question from "@/models/Question";
import ExamAttempt from "@/models/ExamAttempt";
import { studentCanAccessCourse } from "@/app/api/_lib/studentCourseAccess";
import { isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid exam id" }, { status: 400 });
    }

    const exam = await Exam.findById(id).lean();
    if (!exam || !exam.isActive || !exam.isPublished) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }
    if (exam.course) {
      const canAccess = await studentCanAccessCourse(auth.user.id, exam.course);
      if (!canAccess) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const wantsCorrectAnswers = searchParams.get("includeCorrectAnswers") === "true";

    const latestAttempt = wantsCorrectAnswers
      ? await ExamAttempt.findOne({
          exam: exam._id,
          student: toObjectId(auth.user.id),
          isSubmitted: true,
          status: { $in: ["completed", "pending_review"] },
        })
          .sort({ submittedAt: -1, createdAt: -1 })
          .select("status")
          .lean()
      : null;

    // Reveal correct/model answers only after the attempt is fully graded
    // (status "completed"), and only when the exam allows review.
    const canShowCorrectAnswers =
      wantsCorrectAnswers &&
      exam.allowReview !== false &&
      exam.showCorrectAnswers !== false &&
      Boolean(latestAttempt) &&
      latestAttempt!.status === "completed";

    const questionFilter = exam.questions.length
      ? { _id: { $in: exam.questions } }
      : { exam: new mongoose.Types.ObjectId(id) };
    const questions = await Question.find(questionFilter).sort({ createdAt: 1 }).lean();
    const cleanedQuestions = questions.map((q) => ({
      _id: String(q._id),
      question: q.question,
      type: q.type,
      marks: q.marks,
      difficulty: q.difficulty,
      timeLimit: q.timeLimit,
      options: Array.isArray(q.options)
        ? q.options.map((o: any, i: number) => ({
            _id: String(i),
            text: o.text,
            isCorrect: canShowCorrectAnswers ? Boolean(o.isCorrect) : false,
          }))
        : [],
      correctAnswer: canShowCorrectAnswers
        ? q.correctAnswer
          ? String(q.correctAnswer)
          : undefined
        : undefined,
      explanation: canShowCorrectAnswers ? q.explanation || undefined : undefined,
      hints: Array.isArray(q.hints) ? q.hints : [],
      tags: Array.isArray(q.tags) ? q.tags : [],
      category: q.category || undefined,
    }));

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          ...exam,
          _id: String(exam._id),
          questions: cleanedQuestions.map((q) => q._id),
        },
        questions: cleanedQuestions,
      },
    });
  } catch (error) {
    console.error("Student exam by id GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch exam" }, { status: 500 });
  }
}
