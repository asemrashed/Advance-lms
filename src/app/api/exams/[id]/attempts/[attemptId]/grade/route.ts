import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import Question from "@/models/Question";
import { instructorExamAccessMatch, isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

interface RouteCtx {
  params: Promise<{ id: string; attemptId: string }>;
}

function isManualType(t: string) {
  return t === "written" || t === "essay";
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id, attemptId } = await ctx.params;
    if (!isObjectId(id) || !isObjectId(attemptId)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const examOid = toObjectId(id);
    let examFull: Record<string, unknown> | null = null;
    if (auth.user.role === "instructor") {
      const scope = await instructorExamAccessMatch(auth.user.id);
      examFull = await Exam.findOne({ $and: [{ _id: examOid }, scope] }).select("questions totalMarks passingMarks").lean();
    } else {
      examFull = await Exam.findOne({ _id: examOid }).select("questions totalMarks passingMarks").lean();
    }
    if (!examFull) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    const attempt = await ExamAttempt.findOne({ _id: attemptId, exam: examOid });
    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt not found" }, { status: 404 });
    }
    if (attempt.status !== "completed" && attempt.status !== "pending_review") {
      return NextResponse.json(
        { success: false, error: "Only submitted attempts can be graded" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      answerGrades?: Array<{ questionId: string; marksObtained: number }>;
    };
    const grades = Array.isArray(body.answerGrades) ? body.answerGrades : [];
    if (!grades.length) {
      return NextResponse.json({ success: false, error: "answerGrades is required" }, { status: 400 });
    }

    const questionIds = grades
      .map((g) => g.questionId)
      .filter((qid): qid is string => typeof qid === "string" && mongoose.Types.ObjectId.isValid(qid));
    const questions = await Question.find({
      _id: { $in: questionIds.map((q) => toObjectId(q)) },
    })
      .select("_id marks exam type")
      .lean();
    const allowedQuestionIds = new Set(
      (Array.isArray(examFull.questions) ? examFull.questions : []).map((q: unknown) => String(q)),
    );
    const onExam = questions.filter(
      (q) =>
        allowedQuestionIds.has(String(q._id)) ||
        (q.exam != null && String(q.exam) === String(examOid)),
    );
    const marksCap = new Map(onExam.map((q) => [String(q._id), Number(q.marks || 0)]));

    const gradeByQ = new Map<string, number>();
    for (const g of grades) {
      if (typeof g.questionId !== "string" || !mongoose.Types.ObjectId.isValid(g.questionId)) continue;
      const cap = marksCap.get(g.questionId);
      if (cap === undefined) continue;
      const m = Math.max(0, Math.min(cap, Number(g.marksObtained)));
      gradeByQ.set(g.questionId, m);
    }

    for (const ans of attempt.answers || []) {
      const qid = String(ans.question);
      if (gradeByQ.has(qid)) {
        ans.marksObtained = gradeByQ.get(qid)!;
        (ans as { gradingStatus?: string }).gradingStatus = "graded";
      }
    }

    const answerQuestionIds = (attempt.answers || []).map((a: { question: unknown }) => a.question);
    const allTypes = await Question.find({ _id: { $in: answerQuestionIds } })
      .select("_id type")
      .lean();
    const typeBy = new Map(allTypes.map((q) => [String(q._id), String(q.type)]));

    let anyManualPending = false;
    for (const ans of attempt.answers || []) {
      const t = typeBy.get(String(ans.question)) || "";
      if (!isManualType(t)) continue;
      if ((ans as { gradingStatus?: string }).gradingStatus === "pending") {
        anyManualPending = true;
        break;
      }
    }

    let marksObtained = 0;
    for (const ans of attempt.answers || []) {
      marksObtained += Number(ans.marksObtained || 0);
    }

    const totalMarks = Number(examFull.totalMarks || attempt.totalMarks || 0);
    const percentage = totalMarks > 0 ? Number(((marksObtained / totalMarks) * 100).toFixed(2)) : 0;
    const isPassed = !anyManualPending && percentage >= Number(examFull.passingMarks || 0);

    attempt.marksObtained = marksObtained;
    attempt.percentage = percentage;
    attempt.isPassed = isPassed;
    attempt.status = anyManualPending ? "pending_review" : "completed";
    await attempt.save();

    return NextResponse.json({
      success: true,
      data: {
        attempt: {
          _id: String(attempt._id),
          marksObtained,
          percentage,
          isPassed,
          status: attempt.status,
        },
      },
    });
  } catch (error) {
    console.error("Exam attempt grade PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to grade attempt" }, { status: 500 });
  }
}
