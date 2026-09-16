import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Question from "@/models/Question";
import Exam from "@/models/Exam";
import { instructorExamAccessMatch, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";
import {
  assertCanAttachToExam,
  assertQuestionTypesForExam,
  reconcileExamTotalMarks,
} from "@/app/api/_lib/examHelpers";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      questions?: Array<Record<string, unknown>>;
      exam?: string;
    };
    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json(
        { success: false, error: "questions array is required" },
        { status: 400 },
      );
    }

    let examId: mongoose.Types.ObjectId | undefined;
    let examType: "mcq" | "written" | "mixed" = "mixed";

    if (typeof body.exam === "string" && mongoose.Types.ObjectId.isValid(body.exam)) {
      const scope =
        auth.user.role === "instructor"
          ? await instructorExamAccessMatch(auth.user.id)
          : undefined;
      const access = await assertCanAttachToExam({
        examId: body.exam,
        userId: auth.user.id,
        role: auth.user.role,
        examAccessMatch: scope,
      });
      if (!access.ok) {
        return NextResponse.json(
          { success: false, error: access.error },
          { status: access.status },
        );
      }
      examId = new mongoose.Types.ObjectId(body.exam);
      examType = access.exam.type;
    }

    const docs = [];
    for (const q of body.questions) {
      const type =
        q.type === "written" ||
        q.type === "true_false" ||
        q.type === "fill_blank" ||
        q.type === "essay"
          ? q.type
          : "mcq";

      if (examId) {
        const typeError = assertQuestionTypesForExam(examType, [type]);
        if (typeError) {
          return NextResponse.json({ success: false, error: typeError }, { status: 400 });
        }
      }

      const text = String(q.question || "").trim();
      if (!text) {
        return NextResponse.json(
          { success: false, error: "Each question needs question text" },
          { status: 400 },
        );
      }

      docs.push({
        question: text,
        type,
        marks: Number(q.marks || 1),
        difficulty: q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium",
        category: String(q.category || "").trim() || undefined,
        tags: Array.isArray(q.tags) ? q.tags : [],
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: String(q.correctAnswer || "").trim() || undefined,
        explanation: String(q.explanation || "").trim() || undefined,
        hints: Array.isArray(q.hints) ? q.hints : [],
        timeLimit: Number(q.timeLimit || 0) || undefined,
        createdBy: toObjectId(auth.user.id),
        exam: examId,
        isActive: true,
        subjectId:
          typeof q.subjectId === "string" && mongoose.Types.ObjectId.isValid(q.subjectId)
            ? new mongoose.Types.ObjectId(q.subjectId)
            : undefined,
        subject: String(q.subject || "").trim() || undefined,
        subjectCode: String(q.subjectCode || "").trim() || undefined,
        grade: String(q.grade || "").trim() || undefined,
        componentId: String(q.componentId || "").trim() || undefined,
        topic: String(q.topic || "").trim() || undefined,
        subtopic: String(q.subtopic || "").trim() || undefined,
      });
    }

    const inserted = await Question.insertMany(docs);
    if (examId && inserted.length > 0) {
      await Exam.findByIdAndUpdate(examId, {
        $addToSet: { questions: { $each: inserted.map((q) => q._id) } },
      });
      await reconcileExamTotalMarks(String(examId));
    }
    return NextResponse.json({ success: true, data: inserted.map((x) => x.toObject()) });
  } catch (error) {
    console.error("Questions bulk POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to import questions" }, { status: 500 });
  }
}
