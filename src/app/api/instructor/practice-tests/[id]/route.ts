import { NextRequest, NextResponse } from "next/server";
import BatchPracticeTest from "@/models/BatchPracticeTest";
import Chapter from "@/models/Chapter";
import Lesson from "@/models/Lesson";
import Question from "@/models/Question";
import {
  isObjectId,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";

type Params = { params: Promise<{ id: string }> };

function mapTest(doc: Record<string, unknown>) {
  const questions = Array.isArray(doc.questions) ? doc.questions : [];
  return {
    _id: String(doc._id),
    title: doc.title,
    description: doc.description || "",
    course: doc.course,
    batch: doc.batch,
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

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionUser(["instructor"]);
    if (auth.error || !auth.user) return auth.error;
    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const row = await BatchPracticeTest.findOne({
      _id: toObjectId(id),
      createdBy: toObjectId(auth.user.id),
    })
      .populate({ path: "course", select: "title" })
      .populate({ path: "chapter", select: "title" })
      .populate({ path: "lesson", select: "title" })
      .populate({
        path: "questions.question",
        select:
          "question type marks difficulty chapter options correctAnswer explanation",
      })
      .lean();

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Practice test not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: mapTest(row as Record<string, unknown>),
    });
  } catch (error) {
    console.error("GET /api/instructor/practice-tests/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load practice test" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionUser(["instructor"]);
    if (auth.error || !auth.user) return auth.error;
    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const existing = await BatchPracticeTest.findOne({
      _id: toObjectId(id),
      createdBy: toObjectId(auth.user.id),
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Practice test not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.title === "string" && body.title.trim()) {
      existing.title = body.title.trim();
    }
    if (typeof body.description === "string") {
      existing.description = body.description.trim();
    }
    if (Number.isFinite(Number(body.durationMinutes))) {
      existing.durationMinutes = Math.max(1, Number(body.durationMinutes));
    }

    const chapterId =
      typeof body.chapterId === "string" ? body.chapterId.trim() : "";
    const lessonId =
      typeof body.lessonId === "string" ? body.lessonId.trim() : "";
    if (chapterId || typeof body.lessonId === "string") {
      const targetChapterId = chapterId || String(existing.chapter || "");
      if (!isObjectId(targetChapterId)) {
        return NextResponse.json(
          { success: false, error: "Valid chapterId is required" },
          { status: 400 },
        );
      }
      if (lessonId && !isObjectId(lessonId)) {
        return NextResponse.json(
          { success: false, error: "Invalid lessonId" },
          { status: 400 },
        );
      }
      const [chapter, lesson] = await Promise.all([
        Chapter.findOne({
          _id: toObjectId(targetChapterId),
          course: existing.course,
        })
          .select("_id")
          .lean(),
        lessonId
          ? Lesson.findOne({
              _id: toObjectId(lessonId),
              course: existing.course,
              chapter: toObjectId(targetChapterId),
            })
              .select("_id")
              .lean()
          : null,
      ]);
      if (!chapter) {
        return NextResponse.json(
          { success: false, error: "Chapter does not belong to this course" },
          { status: 400 },
        );
      }
      if (lessonId && !lesson) {
        return NextResponse.json(
          { success: false, error: "Lesson does not belong to this chapter" },
          { status: 400 },
        );
      }
      existing.chapter = toObjectId(targetChapterId);
      existing.lesson = lessonId ? toObjectId(lessonId) : undefined;
    }

    if (Array.isArray(body.questions)) {
      const questionIds = body.questions
        .map((q) => {
          const row = q as Record<string, unknown>;
          return String(row.questionId || row.question || "");
        })
        .filter((qid) => isObjectId(qid));
      const owned = questionIds.length
        ? await Question.find({
            _id: { $in: questionIds.map((qid) => toObjectId(qid)) },
            createdBy: toObjectId(auth.user.id),
          })
            .select("_id marks")
            .lean()
        : [];
      const ownedMap = new Map(owned.map((q) => [String(q._id), q] as const));
      existing.questions = body.questions
        .map((q, index) => {
          const row = q as Record<string, unknown>;
          const qid = String(row.questionId || row.question || "");
          if (!ownedMap.has(qid)) return null;
          return {
            question: toObjectId(qid),
            marks: Number(row.marks) || Number(ownedMap.get(qid)?.marks) || 1,
            order: Number.isFinite(Number(row.order))
              ? Number(row.order)
              : index,
          };
        })
        .filter(Boolean) as typeof existing.questions;
      if (existing.questions.length !== body.questions.length) {
        return NextResponse.json(
          {
            success: false,
            error:
              "One or more selected questions are unavailable. Remove them and add them again.",
          },
          { status: 400 },
        );
      }
      if (existing.questions.length === 0) {
        return NextResponse.json(
          { success: false, error: "Add at least one question" },
          { status: 400 },
        );
      }
      existing.totalMarks = existing.questions.reduce(
        (sum: number, q: { marks: number }) => sum + q.marks,
        0,
      );
    }

    if (body.status === "published" || body.publish === true) {
      existing.status = "published";
      existing.publishedAt = existing.publishedAt || new Date();
    } else if (body.status === "draft" || body.status === "archived") {
      existing.status = body.status;
    }

    await existing.save();
    return NextResponse.json({
      success: true,
      data: mapTest(existing.toObject() as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("PATCH /api/instructor/practice-tests/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update practice test" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error || !auth.user) return auth.error;
    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }
    const filter: Record<string, unknown> = { _id: toObjectId(id) };
    if (auth.user.role === "instructor") {
      filter.createdBy = toObjectId(auth.user.id);
    }
    const deleted = await BatchPracticeTest.findOneAndDelete(filter);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Practice test not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/instructor/practice-tests/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete practice test" },
      { status: 500 },
    );
  }
}
