import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Question from "@/models/Question";
import Exam from "@/models/Exam";
import { isObjectId, requireSessionUser } from "@/app/api/_lib/phase12";
import { instructorCanAccessQuestion } from "@/app/api/_lib/questionBank";
import {
  assertQuestionTypesForExam,
  reconcileExamTotalMarks,
} from "@/app/api/_lib/examHelpers";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

async function getQuestionForUser(id: string, userId: string, role: string) {
  if (role === "instructor") {
    const ok = await instructorCanAccessQuestion(userId, id);
    if (!ok) return null;
    return Question.findById(id);
  }
  return Question.findById(id);
}

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid question id" }, { status: 400 });
    }
    const q = await getQuestionForUser(id, auth.user.id, auth.user.role);
    if (!q) return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: q.toObject() });
  } catch (error) {
    console.error("Question by id GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch question" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid question id" }, { status: 400 });
    }
    const q = await getQuestionForUser(id, auth.user.id, auth.user.role);
    if (!q) return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const keys = [
      "question",
      "type",
      "marks",
      "difficulty",
      "category",
      "tags",
      "options",
      "correctAnswer",
      "explanation",
      "hints",
      "timeLimit",
      "isActive",
      "subject",
      "subjectCode",
      "grade",
      "componentId",
      "topic",
      "subtopic",
    ] as const;
    for (const key of keys) {
      if (key in body) (q as any)[key] = body[key];
    }
    if (typeof body.subjectId === "string" && mongoose.Types.ObjectId.isValid(body.subjectId)) {
      (q as { subjectId?: mongoose.Types.ObjectId }).subjectId = new mongoose.Types.ObjectId(
        body.subjectId,
      );
    }
    if (typeof body.exam === "string" && mongoose.Types.ObjectId.isValid(body.exam)) {
      q.exam = new mongoose.Types.ObjectId(body.exam);
    }
    if (q.exam) {
      const exam = await Exam.findById(q.exam).select("type").lean();
      if (!exam) {
        return NextResponse.json(
          { success: false, error: "Exam not found" },
          { status: 404 },
        );
      }
      const typeError = assertQuestionTypesForExam(
        exam.type as "mcq" | "written" | "mixed",
        [String(q.type)],
      );
      if (typeError) {
        return NextResponse.json(
          { success: false, error: typeError },
          { status: 400 },
        );
      }
    }
    await q.save();
    if (q.exam) {
      await reconcileExamTotalMarks(String(q.exam));
    }
    return NextResponse.json({ success: true, data: q.toObject() });
  } catch (error) {
    console.error("Question by id PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid question id" }, { status: 400 });
    }
    const q = await getQuestionForUser(id, auth.user.id, auth.user.role);
    if (!q) return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    const examId = q.exam ? String(q.exam) : null;
    await Question.deleteOne({ _id: q._id });
    if (examId) {
      await Exam.findByIdAndUpdate(examId, { $pull: { questions: q._id } });
      await reconcileExamTotalMarks(examId);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Question by id DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete question" }, { status: 500 });
  }
}
