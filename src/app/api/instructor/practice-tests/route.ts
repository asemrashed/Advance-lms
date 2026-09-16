import { NextRequest, NextResponse } from "next/server";
import BatchPracticeTest from "@/models/BatchPracticeTest";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import Question from "@/models/Question";
import {
  isObjectId,
  pagination,
  parseLimit,
  parsePage,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";
import { instructorCanAccessCourse } from "@/app/api/_lib/instructorCourses";
import { isAdminAreaRole } from "@/lib/roles";

async function assertCanManageCourse(
  user: { id: string; role: string },
  courseId: string,
) {
  if (isAdminAreaRole(user.role)) {
    const course = await Course.findById(courseId).select("_id").lean();
    if (!course) return { error: "Course not found" as const };
    return { course };
  }
  const allowed = await instructorCanAccessCourse(user.id, courseId);
  if (!allowed) {
    const course = await Course.findById(courseId).select("_id").lean();
    if (!course) return { error: "Course not found" as const };
    return { error: "Forbidden" as const };
  }
  return { course: true };
}

function mapTest(doc: Record<string, unknown>) {
  const questions = Array.isArray(doc.questions) ? doc.questions : [];
  return {
    _id: String(doc._id),
    title: doc.title,
    description: doc.description || "",
    course: doc.course,
    batch: doc.batch || null,
    chapter: doc.chapter,
    lesson: doc.lesson || null,
    createdBy: doc.createdBy,
    durationMinutes: doc.durationMinutes,
    totalMarks: doc.totalMarks,
    questions,
    questionCount: questions.length,
    status: doc.status,
    publishedAt: doc.publishedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error || !auth.user) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 20, 100);
    const status = (searchParams.get("status") || "").trim();
    const courseId = (searchParams.get("courseId") || "").trim();

    const filter: Record<string, unknown> = {};
    if (auth.user.role === "instructor") {
      filter.createdBy = toObjectId(auth.user.id);
    }
    if (status && status !== "all") filter.status = status;
    if (isObjectId(courseId)) filter.course = toObjectId(courseId);

    const [total, rows] = await Promise.all([
      BatchPracticeTest.countDocuments(filter),
      BatchPracticeTest.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "course", select: "title" })
        .populate({ path: "chapter", select: "title" })
        .populate({ path: "lesson", select: "title" })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tests: rows.map((r) => mapTest(r as Record<string, unknown>)),
        pagination: pagination(page, limit, total),
      },
    });
  } catch (error) {
    console.error("GET /api/instructor/practice-tests", error);
    return NextResponse.json(
      { success: false, error: "Failed to list practice tests" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error || !auth.user) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.title || "").trim();
    const courseId = String(body.courseId || "").trim();
    const chapterId = String(body.chapterId || "").trim();
    const lessonId = String(body.lessonId || "").trim();
    const durationMinutes = Number(body.durationMinutes) || 60;
    const description = String(body.description || "").trim();
    const publish = Boolean(body.publish);
    const rawQuestions = Array.isArray(body.questions) ? body.questions : [];

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
      );
    }
    if (!isObjectId(courseId) || !isObjectId(chapterId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid courseId and chapterId are required",
        },
        { status: 400 },
      );
    }
    if (lessonId && !isObjectId(lessonId)) {
      return NextResponse.json(
        { success: false, error: "lessonId must be valid when provided" },
        { status: 400 },
      );
    }

    const ownership = await assertCanManageCourse(auth.user, courseId);
    if ("error" in ownership && ownership.error) {
      return NextResponse.json(
        { success: false, error: ownership.error },
        { status: ownership.error === "Forbidden" ? 403 : 404 },
      );
    }

    const [chapter, lesson] = await Promise.all([
      Chapter.findOne({ _id: toObjectId(chapterId), course: toObjectId(courseId) })
        .select("_id")
        .lean(),
      lessonId
        ? Lesson.findOne({
            _id: toObjectId(lessonId),
            course: toObjectId(courseId),
            chapter: toObjectId(chapterId),
          })
            .select("_id")
            .lean()
        : null,
    ]);
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: "Chapter does not belong to the selected course" },
        { status: 400 },
      );
    }
    if (lessonId && !lesson) {
      return NextResponse.json(
        { success: false, error: "Lesson does not belong to the selected chapter" },
        { status: 400 },
      );
    }

    const questionIds = rawQuestions
      .map((q) => {
        const row = q as Record<string, unknown>;
        return String(row.questionId || row.question || "");
      })
      .filter((id) => isObjectId(id));

    const ownedQuestions = questionIds.length
      ? await Question.find({
          _id: { $in: questionIds.map((id) => toObjectId(id)) },
          ...(isAdminAreaRole(auth.user.role)
            ? {}
            : { createdBy: toObjectId(auth.user.id) }),
        })
          .select("_id marks")
          .lean()
      : [];
    const ownedMap = new Map(
      ownedQuestions.map((q) => [String(q._id), q] as const),
    );

    const questions = rawQuestions
      .map((q, index) => {
        const row = q as Record<string, unknown>;
        const qid = String(row.questionId || row.question || "");
        if (!ownedMap.has(qid)) return null;
        const marks =
          Number(row.marks) || Number(ownedMap.get(qid)?.marks) || 1;
        return {
          question: toObjectId(qid),
          marks,
          order: Number.isFinite(Number(row.order)) ? Number(row.order) : index,
        };
      })
      .filter(Boolean) as Array<{
      question: ReturnType<typeof toObjectId>;
      marks: number;
      order: number;
    }>;

    if (rawQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Add at least one question" },
        { status: 400 },
      );
    }
    if (questions.length !== rawQuestions.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more selected questions are unavailable. Remove them and add them again.",
        },
        { status: 400 },
      );
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    const created = await BatchPracticeTest.create({
      title,
      description: description || undefined,
      course: toObjectId(courseId),
      chapter: toObjectId(chapterId),
      lesson: lessonId ? toObjectId(lessonId) : undefined,
      createdBy: toObjectId(auth.user.id),
      durationMinutes: Math.max(1, durationMinutes),
      totalMarks,
      questions,
      status: publish ? "published" : "draft",
      publishedAt: publish ? new Date() : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: mapTest(created.toObject() as unknown as Record<string, unknown>),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/instructor/practice-tests", error);
    return NextResponse.json(
      { success: false, error: "Failed to create practice test" },
      { status: 500 },
    );
  }
}
