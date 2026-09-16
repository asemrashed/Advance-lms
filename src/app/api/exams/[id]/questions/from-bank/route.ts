import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Exam from "@/models/Exam";
import Lesson from "@/models/Lesson";
import PlatformQuestion from "@/models/PlatformQuestion";
import Question from "@/models/Question";
import {
  instructorExamAccessMatch,
  isObjectId,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";
import {
  assertQuestionTypesForExam,
  reconcileExamTotalMarks,
} from "@/app/api/_lib/examHelpers";
import { buildGrantedPlatformQuestionFilter } from "@/app/api/_lib/platformQuestionAccess";
import { isAdminAreaRole } from "@/lib/roles";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

type ExamForBank = {
  _id: mongoose.Types.ObjectId;
  course?: mongoose.Types.ObjectId;
  subject?: string;
  subjectCode?: string;
  grade?: string;
  type: "mcq" | "written" | "mixed";
  questions?: mongoose.Types.ObjectId[];
  totalMarks?: number;
};

type BankQuestion = {
  _id: string;
  question: string;
  type: "mcq" | "written" | "true_false" | "fill_blank" | "essay";
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  category?: string;
  tags?: string[];
  options?: Array<{ text: string; isCorrect: boolean; explanation?: string }>;
  correctAnswer?: string;
  explanation?: string;
  hints?: string[];
  timeLimit?: number;
  sourcePlatformQuestionId?: string;
  isSharedPlatform?: boolean;
  alreadyOnExam?: boolean;
};

const GENERAL_TOPIC = "General";

function normalizeTopic(raw: unknown): string {
  const value = String(raw || "").trim();
  return value || GENERAL_TOPIC;
}

async function getExamForInstructor(id: string, userId: string) {
  if (!isObjectId(id)) return null;
  const scope = await instructorExamAccessMatch(userId);
  return Exam.findOne({ $and: [{ _id: toObjectId(id) }, scope] })
    .select("_id course subject subjectCode grade type questions totalMarks")
    .lean<ExamForBank>();
}

async function loadSubjectBank(exam: ExamForBank, userId: string) {
  const course = exam.course
    ? await Course.findById(exam.course)
        .select("_id subjectId subjectName subjectCode grade")
        .lean()
    : null;
  const subjectId = course?.subjectId;
  const subjectName = String(exam.subject || course?.subjectName || "").trim();
  const subjectCode = String(exam.subjectCode || course?.subjectCode || "")
    .trim()
    .toUpperCase();
  const grade = String(exam.grade || course?.grade || "").trim().toUpperCase();

  const courseSubjectParts: Record<string, unknown>[] = [];
  if (subjectId) courseSubjectParts.push({ subjectId });
  if (subjectCode) courseSubjectParts.push({ subjectCode });
  if (subjectName) courseSubjectParts.push({ subjectName });

  const subjectCourseFilter: Record<string, unknown> =
    courseSubjectParts.length > 0 ? { $or: courseSubjectParts } : { _id: exam.course };
  if (grade) subjectCourseFilter.grade = grade;

  const courseIds = await Course.find(subjectCourseFilter).distinct("_id");
  const [examIds, chapters] = await Promise.all([
    Exam.find({ course: { $in: courseIds } }).distinct("_id"),
    Chapter.find({ course: { $in: courseIds } }).select("_id title").lean(),
  ]);
  const chapterIds = chapters.map((c) => c._id);
  const chapterTitleById = new Map(
    chapters.map((c) => [String(c._id), normalizeTopic(c.title)]),
  );
  const lessons = chapterIds.length
    ? await Lesson.find({ chapter: { $in: chapterIds } }).select("_id chapter").lean()
    : [];
  const lessonIds = lessons.map((l) => l._id);
  const topicByLessonId = new Map(
    lessons.map((l) => [
      String(l._id),
      chapterTitleById.get(String(l.chapter)) || GENERAL_TOPIC,
    ]),
  );

  const ownedSubjectParts: Record<string, unknown>[] = [];
  if (subjectName) {
    ownedSubjectParts.push({ category: subjectName }, { tags: subjectName });
  }
  if (subjectCode) ownedSubjectParts.push({ tags: subjectCode });

  const hierarchyParts: Record<string, unknown>[] = [];
  if (examIds.length) hierarchyParts.push({ exam: { $in: examIds } });
  if (lessonIds.length) hierarchyParts.push({ lesson: { $in: lessonIds } });
  if (ownedSubjectParts.length) {
    hierarchyParts.push({
      createdBy: toObjectId(userId),
      $or: ownedSubjectParts,
    });
  }

  // Include questions already on this exam so the UI can show them as ticked.
  const ownRows = hierarchyParts.length
    ? await Question.find({
        isActive: { $ne: false },
        $or: hierarchyParts,
      })
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean()
    : [];

  const onExamIdSet = new Set(
    (exam.questions || []).map((id) => String(id)),
  );
  // Also treat any Question document whose exam field is this exam as on-exam.
  for (const row of ownRows) {
    if (row.exam && String(row.exam) === String(exam._id)) {
      onExamIdSet.add(String(row._id));
    }
  }
  const onExamPlatformIds = new Set(
    ownRows
      .filter((row) => onExamIdSet.has(String(row._id)) && row.sourcePlatformQuestionId)
      .map((row) => String(row.sourcePlatformQuestionId)),
  );

  const ownQuestions: BankQuestion[] = ownRows.map((row) => {
    const lessonTopic = row.lesson
      ? topicByLessonId.get(String(row.lesson))
      : undefined;
    const tagTopic = Array.isArray(row.tags)
      ? (row.tags as string[]).find(
          (tag: string) =>
            tag &&
            tag !== subjectName &&
            tag.toUpperCase() !== subjectCode,
        )
      : undefined;
    return {
      _id: String(row._id),
      question: row.question,
      type: row.type,
      marks: Number(row.marks || 1),
      difficulty: row.difficulty,
      topic: normalizeTopic(lessonTopic || tagTopic || row.category || GENERAL_TOPIC),
      category: row.category,
      tags: row.tags,
      options: row.options,
      correctAnswer: row.correctAnswer,
      explanation: row.explanation,
      hints: row.hints,
      timeLimit: row.timeLimit,
      sourcePlatformQuestionId: row.sourcePlatformQuestionId
        ? String(row.sourcePlatformQuestionId)
        : undefined,
      isSharedPlatform: false,
      alreadyOnExam: onExamIdSet.has(String(row._id)),
    };
  });

  const grantedFilter = await buildGrantedPlatformQuestionFilter(userId);
  let sharedQuestions: BankQuestion[] = [];
  if (grantedFilter) {
    const platformSubjectParts: Record<string, unknown>[] = [];
    if (subjectId) platformSubjectParts.push({ subjectId });
    if (subjectCode) platformSubjectParts.push({ subjectCode });
    if (subjectName) platformSubjectParts.push({ subject: subjectName });

    if (platformSubjectParts.length) {
      const sharedRows = await PlatformQuestion.find({
        $and: [
          grantedFilter,
          { $or: platformSubjectParts },
          ...(grade ? [{ $or: [{ grade }, { grade: { $exists: false } }, { grade: "" }] }] : []),
        ],
      })
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();
      const forkedIds = new Set(
        ownRows
          .map((row) => row.sourcePlatformQuestionId)
          .filter(Boolean)
          .map(String),
      );
      const difficultyMap: Record<number, "easy" | "medium" | "hard"> = {
        1: "easy",
        2: "medium",
        3: "hard",
      };
      // Keep platform originals that are already on THIS exam so they appear
      // ticked under their topic. Hide other forked originals (copies live in own bank).
      sharedQuestions = sharedRows
        .filter((row) => {
          const id = String(row._id);
          if (!forkedIds.has(id)) return true;
          return onExamPlatformIds.has(id);
        })
        .map((row) => ({
          _id: `platform:${String(row._id)}`,
          question: row.questionText,
          type: row.questionFormat === "written" ? ("written" as const) : ("mcq" as const),
          marks: Number(row.marks) > 0 ? Number(row.marks) : 1,
          difficulty: difficultyMap[Number(row.difficulty)] || "medium",
          topic: normalizeTopic(row.topic),
          category: row.subject,
          tags: [row.subject, row.topic].filter(Boolean) as string[],
          options: Array.isArray(row.options) ? row.options : [],
          correctAnswer: row.answerText,
          explanation: row.explanation,
          sourcePlatformQuestionId: String(row._id),
          isSharedPlatform: true,
          alreadyOnExam: onExamPlatformIds.has(String(row._id)),
        }));
    }
  }

  // Prefer the platform topic row (ticked) over the forked own copy for the same source.
  const onExamPlatformSourceIds = new Set(
    sharedQuestions
      .filter((q) => q.alreadyOnExam && q.sourcePlatformQuestionId)
      .map((q) => String(q.sourcePlatformQuestionId)),
  );
  const dedupedOwn = ownQuestions.filter((q) => {
    if (!q.alreadyOnExam || !q.sourcePlatformQuestionId) return true;
    return !onExamPlatformSourceIds.has(String(q.sourcePlatformQuestionId));
  });

  const questions = [...dedupedOwn, ...sharedQuestions].filter(
    (question) => !assertQuestionTypesForExam(exam.type, [question.type]),
  );

  const topicSet = new Set<string>();
  for (const q of questions) topicSet.add(q.topic);
  const topics = Array.from(topicSet).sort((a, b) => {
    if (a === GENERAL_TOPIC) return 1;
    if (b === GENERAL_TOPIC) return -1;
    return a.localeCompare(b);
  });

  return {
    subject: subjectName || subjectCode || "this subject",
    topics,
    questions,
  };
}

function paginateQuestions(
  questions: BankQuestion[],
  topic: string,
  page: number,
  limit: number,
) {
  const filtered = topic
    ? questions.filter((q) => q.topic.toLowerCase() === topic.toLowerCase())
    : questions;
  const total = filtered.length;
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  const safePage = pages > 0 ? Math.min(Math.max(page, 1), pages) : 1;
  const skip = (safePage - 1) * limit;
  return {
    questions: filtered.slice(skip, skip + limit),
    pagination: {
      page: safePage,
      limit,
      total,
      pages,
    },
  };
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["instructor", "admin"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    const exam = await getExamForInstructor(id, auth.user.id);
    if (!exam) {
      // Admin fallback: allow admin to load any exam bank
      if (isAdminAreaRole(auth.user.role) && isObjectId(id)) {
        const adminExam = await Exam.findById(id)
          .select("_id course subject subjectCode grade type questions totalMarks")
          .lean<ExamForBank>();
        if (!adminExam) {
          return NextResponse.json(
            { success: false, error: "Exam not found or access denied" },
            { status: 404 },
          );
        }
        return respondBank(request, adminExam, auth.user.id);
      }
      return NextResponse.json(
        { success: false, error: "Exam not found or access denied" },
        { status: 404 },
      );
    }
    return respondBank(request, exam, auth.user.id);
  } catch (error) {
    console.error("Exam question-bank GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subject question bank" },
      { status: 500 },
    );
  }
}

async function respondBank(
  request: NextRequest,
  exam: ExamForBank,
  userId: string,
) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10) || 50),
  );
  let topic = (searchParams.get("topic") || "").trim();

  const bank = await loadSubjectBank(exam, userId);
  if (!topic && bank.topics.length > 0) {
    topic = bank.topics[0];
  }

  const paged = paginateQuestions(bank.questions, topic, page, limit);

  const onExamIds = Array.isArray(exam.questions) ? exam.questions : [];
  let alreadyOnExamCount = onExamIds.length;
  let alreadyOnExamMarks = Number(exam.totalMarks || 0);
  if (onExamIds.length > 0) {
    const markRows = await Question.find({ _id: { $in: onExamIds } })
      .select("marks")
      .lean();
    alreadyOnExamCount = markRows.length;
    alreadyOnExamMarks = markRows.reduce(
      (sum, row) => sum + Number(row.marks || 0),
      0,
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      subject: bank.subject,
      topics: bank.topics,
      topic,
      questions: paged.questions,
      pagination: paged.pagination,
      examSelection: {
        count: alreadyOnExamCount,
        marks: alreadyOnExamMarks,
      },
    },
  });
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["instructor", "admin"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    let exam = await getExamForInstructor(id, auth.user.id);
    if (!exam && isAdminAreaRole(auth.user.role) && isObjectId(id)) {
      exam = await Exam.findById(id)
        .select("_id course subject subjectCode grade type questions totalMarks")
        .lean<ExamForBank>();
    }
    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Exam not found or access denied" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as { questionIds?: string[] };
    const selectedIds = Array.from(
      new Set((body.questionIds || []).filter((value) => typeof value === "string")),
    );
    if (!selectedIds.length || selectedIds.length > 100) {
      return NextResponse.json(
        { success: false, error: "Select between 1 and 100 questions" },
        { status: 400 },
      );
    }

    const bank = await loadSubjectBank(exam, auth.user.id);
    const bankById = new Map(bank.questions.map((question) => [question._id, question]));
    const selected = selectedIds
      .map((questionId) => bankById.get(questionId))
      .filter((question): question is BankQuestion => Boolean(question))
      // Skip ones already on the exam
      .filter((question) => !question.alreadyOnExam);

    if (selected.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selected questions are already on this exam" },
        { status: 400 },
      );
    }

    const typeError = assertQuestionTypesForExam(
      exam.type,
      selected.map((question) => question.type),
    );
    if (typeError) {
      return NextResponse.json({ success: false, error: typeError }, { status: 400 });
    }

    const inserted = await Question.insertMany(
      selected.map((question) => ({
        question: question.question,
        type: question.type,
        marks: question.marks,
        difficulty: question.difficulty,
        category: question.category,
        tags: question.tags || [],
        options: question.options || [],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        hints: question.hints || [],
        timeLimit: question.timeLimit,
        isActive: true,
        createdBy: toObjectId(auth.user.id),
        exam: exam!._id,
        sourcePlatformQuestionId: question.sourcePlatformQuestionId
          ? toObjectId(question.sourcePlatformQuestionId)
          : undefined,
      })),
    );
    await Exam.findByIdAndUpdate(exam._id, {
      $addToSet: { questions: { $each: inserted.map((question) => question._id) } },
    });
    const totalMarks = await reconcileExamTotalMarks(String(exam._id));

    return NextResponse.json({
      success: true,
      data: { added: inserted.length, totalMarks },
    });
  } catch (error) {
    console.error("Exam question-bank POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add questions from the bank" },
      { status: 500 },
    );
  }
}
