import { NextRequest, NextResponse } from "next/server";
import BatchEnrollment from "@/models/BatchEnrollment";
import BatchPracticeTest from "@/models/BatchPracticeTest";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";
import PracticeTestAttempt, {
  type IPracticeTestAnswer,
} from "@/models/PracticeTestAttempt";
import Question from "@/models/Question";
import {
  isObjectId,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";

type Params = { params: Promise<{ id: string }> };

type AnswerInput = {
  questionId: string;
  selectedOptions?: string[];
  writtenAnswer?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function loadAccessibleTest(testId: string, studentId: string) {
  const test = await BatchPracticeTest.findOne({
    _id: toObjectId(testId),
    status: "published",
  }).lean();
  if (!test) return { error: "Test not found" as const, status: 404 };

  let hasAccess;
  if (test.batch) {
    hasAccess = await BatchEnrollment.exists({
      studentId: toObjectId(studentId),
      batchId: test.batch,
      status: "active",
      paymentStatus: "paid",
    });
  } else {
    const [courseEnrollment, courseBatchIds] = await Promise.all([
      Enrollment.exists({
        student: toObjectId(studentId),
        course: test.course,
        status: { $in: ["enrolled", "in_progress", "completed"] },
      }),
      Batch.find({ courseId: test.course }).distinct("_id"),
    ]);
    hasAccess =
      courseEnrollment ||
      (courseBatchIds.length
        ? await BatchEnrollment.exists({
            studentId: toObjectId(studentId),
            batchId: { $in: courseBatchIds },
            status: "active",
            paymentStatus: "paid",
          })
        : null);
  }

  if (!hasAccess) {
    return { error: "You are not enrolled for this test" as const, status: 403 };
  }
  return { test };
}

async function loadQuestions(test: {
  questions?: Array<{ question: unknown; marks?: number; order?: number }>;
}) {
  const rows = Array.isArray(test.questions) ? test.questions : [];
  const ids = rows
    .map((row) => String(row.question || ""))
    .filter((id) => isObjectId(id));
  const questions = ids.length
    ? await Question.find({ _id: { $in: ids.map(toObjectId) }, isActive: true })
        .select(
          "_id question type options correctAnswer explanation timeLimit",
        )
        .lean()
    : [];
  const byId = new Map(questions.map((question) => [String(question._id), question]));

  return rows
    .map((row, index) => {
      const question = byId.get(String(row.question || ""));
      if (!question) return null;
      return {
        ...question,
        assignedMarks: Math.max(0, Number(row.marks) || 0),
        order: Number.isFinite(Number(row.order)) ? Number(row.order) : index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a!.order) - Number(b!.order));
}

function sanitizeQuestions(
  questions: Array<{
    _id: unknown;
    question?: string;
    type?: string;
    options?: Array<{ text?: string }>;
    assignedMarks: number;
    order: number;
    timeLimit?: number;
  }>,
) {
  return questions.map((question) => ({
    _id: String(question._id),
    question: question.question || "",
    type: question.type || "mcq",
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({ text: option.text || "" }))
      : [],
    marks: question.assignedMarks,
    order: question.order,
    timeLimit: question.timeLimit,
  }));
}

function normalizeAnswers(raw: unknown, allowedIds: Set<string>) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const row = entry as AnswerInput;
      const questionId = String(row.questionId || "");
      if (!allowedIds.has(questionId)) return null;
      return {
        question: toObjectId(questionId),
        selectedOptions: Array.isArray(row.selectedOptions)
          ? row.selectedOptions.map(String).slice(0, 50)
          : [],
        writtenAnswer: String(row.writtenAnswer || "").slice(0, 20000),
      };
    })
    .filter(Boolean);
}

function mapAttempt(
  attempt: {
    _id: unknown;
    status?: string;
    answers?: Array<{
      question: unknown;
      selectedOptions?: string[];
      writtenAnswer?: string;
    }>;
    currentQuestionIndex?: number;
    startedAt?: Date;
    expiresAt?: Date;
    submittedAt?: Date;
    earnedMarks?: number;
    totalMarks?: number;
  },
  test: { _id: unknown; title?: string; description?: string; durationMinutes?: number },
  questions: ReturnType<typeof sanitizeQuestions>,
) {
  return {
    attemptId: String(attempt._id),
    test: {
      _id: String(test._id),
      title: test.title || "Test",
      description: test.description || "",
      durationMinutes: Number(test.durationMinutes) || 0,
    },
    status: attempt.status || "in_progress",
    questions,
    answers: (attempt.answers || []).map((answer) => ({
      questionId: String(answer.question),
      selectedOptions: answer.selectedOptions || [],
      writtenAnswer: answer.writtenAnswer || "",
    })),
    currentQuestionIndex: Number(attempt.currentQuestionIndex) || 0,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    remainingSeconds: Math.max(
      0,
      Math.floor(
        (new Date(attempt.expiresAt || Date.now()).getTime() - Date.now()) / 1000,
      ),
    ),
    submittedAt: attempt.submittedAt,
    earnedMarks: Number(attempt.earnedMarks) || 0,
    totalMarks: Number(attempt.totalMarks) || 0,
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error || !auth.user) return auth.error;
    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid test ID" },
        { status: 400 },
      );
    }

    const access = await loadAccessibleTest(id, auth.user.id);
    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const test = access.test;
    const questions = await loadQuestions(test);
    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, error: "This test has no available questions" },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = String(body.action || "start");
    const student = toObjectId(auth.user.id);
    const practiceTest = toObjectId(id);
    let attempt = await PracticeTestAttempt.findOne({
      practiceTest,
      student,
      status: "in_progress",
    }).sort({ updatedAt: -1 });

    if (action === "start") {
      if (!attempt) {
        const attemptNumber =
          (await PracticeTestAttempt.countDocuments({ practiceTest, student })) + 1;
        const startedAt = new Date();
        attempt = await PracticeTestAttempt.create({
          practiceTest,
          student,
          attemptNumber,
          status: "in_progress",
          answers: [],
          currentQuestionIndex: 0,
          startedAt,
          expiresAt: new Date(
            startedAt.getTime() +
              Math.max(1, Number(test.durationMinutes) || 60) * 60_000,
          ),
          totalMarks: Number(test.totalMarks) || 0,
        });
      }
      return NextResponse.json({
        success: true,
        data: mapAttempt(
          attempt,
          test,
          sanitizeQuestions(questions as Parameters<typeof sanitizeQuestions>[0]),
        ),
      });
    }

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: "No draft attempt was found" },
        { status: 404 },
      );
    }

    const allowedIds = new Set(questions.map((question) => String(question!._id)));
    attempt.answers = normalizeAnswers(body.answers, allowedIds) as typeof attempt.answers;
    attempt.currentQuestionIndex = Math.max(
      0,
      Math.min(
        questions.length - 1,
        Number(body.currentQuestionIndex) || 0,
      ),
    );

    if (action === "save") {
      await attempt.save();
      return NextResponse.json({
        success: true,
        data: mapAttempt(
          attempt,
          test,
          sanitizeQuestions(questions as Parameters<typeof sanitizeQuestions>[0]),
        ),
      });
    }

    if (action !== "submit") {
      return NextResponse.json(
        { success: false, error: "Unsupported action" },
        { status: 400 },
      );
    }

    const answersByQuestion = new Map<string, IPracticeTestAnswer>(
      attempt.answers.map((answer: IPracticeTestAnswer) => [
        String(answer.question),
        answer,
      ]),
    );
    let earnedMarks = 0;
    let requiresReview = false;

    for (const question of questions) {
      if (!question) continue;
      const answer = answersByQuestion.get(String(question._id));
      const type = String(question.type || "mcq");
      if (type === "written" || type === "essay") {
        if (normalizeText(answer?.writtenAnswer)) requiresReview = true;
        continue;
      }
      if (type === "fill_blank") {
        if (
          normalizeText(answer?.writtenAnswer) &&
          normalizeText(answer?.writtenAnswer) ===
            normalizeText(question.correctAnswer)
        ) {
          earnedMarks += question.assignedMarks;
        }
        continue;
      }

      const correct = (
        (question.options || []) as Array<{ isCorrect?: boolean }>
      )
        .map((option: { isCorrect?: boolean }, index: number) =>
          option.isCorrect ? String(index) : null,
        )
        .filter((value: string | null): value is string => Boolean(value))
        .sort();
      const selected = [...(answer?.selectedOptions || [])].sort();
      if (
        correct.length > 0 &&
        correct.length === selected.length &&
        correct.every(
          (value: string, index: number) => value === selected[index],
        )
      ) {
        earnedMarks += question.assignedMarks;
      }
    }

    attempt.status = requiresReview ? "pending_review" : "submitted";
    attempt.submittedAt = new Date();
    attempt.earnedMarks = earnedMarks;
    attempt.totalMarks = Number(test.totalMarks) || 0;
    await attempt.save();

    return NextResponse.json({
      success: true,
      data: mapAttempt(
        attempt,
        test,
        sanitizeQuestions(questions as Parameters<typeof sanitizeQuestions>[0]),
      ),
    });
  } catch (error) {
    console.error("POST /api/student/practice-tests/[id]/attempt", error);
    return NextResponse.json(
      { success: false, error: "Failed to process test attempt" },
      { status: 500 },
    );
  }
}
