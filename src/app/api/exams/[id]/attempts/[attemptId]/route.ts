import { NextRequest, NextResponse } from "next/server";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import Question from "@/models/Question";
import { isObjectId, instructorExamAccessMatch, normalizeStudentName, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

interface RouteCtx {
  params: Promise<{ id: string; attemptId: string }>;
}

function mapStudent(st: unknown) {
  const s = st as { _id?: unknown; name?: string; firstName?: string; lastName?: string; email?: string } | null;
  if (!s || typeof s !== "object") {
    return { _id: "", name: "Unknown", email: "" };
  }
  return {
    _id: String(s._id ?? ""),
    name: normalizeStudentName(s),
    email: String(s.email || ""),
  };
}

async function assertExamAccess(examId: string, auth: { user: { id: string; role: string } }) {
  const examOid = toObjectId(examId);
  let exam: unknown = null;
  if (auth.user.role === "instructor") {
    const scope = await instructorExamAccessMatch(auth.user.id);
    exam = await Exam.findOne({ $and: [{ _id: examOid }, scope] }).lean();
  } else {
    exam = await Exam.findOne({ _id: examOid }).lean();
  }
  return { exam, examOid };
}

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id, attemptId } = await ctx.params;
    if (!isObjectId(id) || !isObjectId(attemptId)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const { exam, examOid } = await assertExamAccess(id, auth);
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    const attempt = await ExamAttempt.findOne({ _id: attemptId, exam: examOid })
      .populate("student", "name email phone")
      .lean();
    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt not found" }, { status: 404 });
    }

    const questionIds = Array.isArray((exam as any).questions) ? (exam as any).questions.map(String) : [];
    const qDocs = questionIds.length
      ? await Question.find({ _id: { $in: questionIds.map((q: string) => toObjectId(q)) } }).lean()
      : [];
    const qById = new Map(qDocs.map((q) => [String(q._id), q]));

    const answerByQ = new Map<string, Record<string, unknown>>(
      (attempt.answers || []).map((a: { question?: unknown }) => [String(a.question), a as Record<string, unknown>]),
    );

    const items = questionIds
      .map((qid: string) => {
        const q = qById.get(qid) as any;
        if (!q) return null;
        const ans = answerByQ.get(qid);
        const selectedRaw = ans?.selectedOptions;
        const selected = Array.isArray(selectedRaw) ? selectedRaw : [];
        const wa = ans?.writtenAnswer;
        const written = wa != null ? String(wa) : "";
        return {
          questionId: qid,
          question: q.question,
          type: q.type,
          marks: Number(q.marks || 0),
          options: Array.isArray(q.options)
            ? q.options.map((o: any, i: number) => ({
                index: String(i),
                text: o.text,
                isCorrect: Boolean(o.isCorrect),
              }))
            : [],
          studentSelected: selected,
          studentWritten: written,
          correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : "",
          marksObtained: typeof ans?.marksObtained === "number" ? (ans.marksObtained as number) : 0,
          isCorrect: typeof ans?.isCorrect === "boolean" ? (ans.isCorrect as boolean) : undefined,
          gradingStatus: typeof ans?.gradingStatus === "string" ? (ans.gradingStatus as string) : undefined,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          _id: String((exam as any)._id),
          title: (exam as any).title,
          type: (exam as any).type,
          totalMarks: (exam as any).totalMarks,
          passingMarks: (exam as any).passingMarks,
        },
        attempt: {
          _id: String(attempt._id),
          status: attempt.status,
          student: mapStudent(attempt.student),
          attemptNumber: attempt.attemptNumber,
          percentage: attempt.percentage,
          marksObtained: attempt.marksObtained,
          totalMarks: attempt.totalMarks,
          isPassed: attempt.isPassed,
          submittedAt: attempt.submittedAt,
          startedAt: attempt.startTime,
        },
        questions: items,
      },
    });
  } catch (error) {
    console.error("Exam attempt GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch attempt" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id, attemptId } = await ctx.params;
    if (!isObjectId(id) || !isObjectId(attemptId)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const { exam, examOid } = await assertExamAccess(id, auth);
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    await ExamAttempt.deleteOne({ _id: toObjectId(attemptId), exam: examOid });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Exam attempt DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete attempt" }, { status: 500 });
  }
}
