import { NextRequest, NextResponse } from "next/server";
import Exam from "@/models/Exam";
import Question from "@/models/Question";
import {
  isObjectId,
  instructorExamAccessMatch,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";
import {
  assertCanPublishExam,
  reconcileExamTotalMarks,
  resolveLiveCourseForStaff,
  validateExamDateOrder,
} from "@/app/api/_lib/examHelpers";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function computeExamStatus(exam: {
  isPublished?: boolean;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  if (!exam.isActive) return "inactive";
  if (!exam.isPublished) return "draft";
  const now = Date.now();
  if (exam.startDate && new Date(exam.startDate).getTime() > now) return "scheduled";
  if (exam.endDate && new Date(exam.endDate).getTime() < now) return "expired";
  return "active";
}

function mapExam(exam: any) {
  return {
    _id: String(exam._id),
    title: exam.title,
    description: exam.description || "",
    type: exam.type,
    duration: exam.duration,
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks,
    instructions: exam.instructions || "",
    startDate: exam.startDate || undefined,
    endDate: exam.endDate || undefined,
    course: exam.course || undefined,
    subject: exam.subject || undefined,
    subjectCode: exam.subjectCode || undefined,
    grade: exam.grade || undefined,
    componentId: exam.componentId ? String(exam.componentId) : undefined,
    componentName: exam.componentName || undefined,
    createdBy: exam.createdBy || undefined,
    questions: Array.isArray(exam.questions) ? exam.questions : [],
    attempts: typeof exam.attempts === "number" ? exam.attempts : 0,
    shuffleQuestions: Boolean(exam.shuffleQuestions),
    shuffleOptions: Boolean(exam.shuffleOptions),
    showCorrectAnswers: Boolean(exam.showCorrectAnswers),
    showResults: exam.showResults !== false,
    allowReview: exam.allowReview !== false,
    timeLimit: exam.timeLimit !== false,
    isActive: exam.isActive !== false,
    isPublished: Boolean(exam.isPublished),
    status: computeExamStatus(exam),
    questionCount: Array.isArray(exam.questions) ? exam.questions.length : 0,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  };
}

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid exam id" }, { status: 400 });
    }

    const examOid = toObjectId(id);
    let exam: unknown = null;
    if (auth.user.role === "instructor") {
      const scope = await instructorExamAccessMatch(auth.user.id);
      exam = await Exam.findOne({ $and: [{ _id: examOid }, scope] })
        .populate("course", "title subjectName subjectCode grade")
        .lean();
    } else {
      exam = await Exam.findOne({ _id: examOid })
        .populate("course", "title subjectName subjectCode grade")
        .lean();
    }
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { exam: mapExam(exam) } });
  } catch (error) {
    console.error("Exams by id GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch exam" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid exam id" }, { status: 400 });
    }

    const examOid = toObjectId(id);
    let existing: Record<string, unknown> | null = null;
    if (auth.user.role === "instructor") {
      const scope = await instructorExamAccessMatch(auth.user.id);
      existing = (await Exam.findOne({ $and: [{ _id: examOid }, scope] }).lean()) as Record<
        string,
        unknown
      > | null;
    } else {
      existing = (await Exam.findOne({ _id: examOid }).lean()) as Record<string, unknown> | null;
    }
    if (!existing) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    const copy = [
      "title",
      "description",
      "type",
      "instructions",
      "shuffleQuestions",
      "shuffleOptions",
      "showCorrectAnswers",
      "showResults",
      "allowReview",
      "timeLimit",
      "isActive",
    ] as const;
    for (const key of copy) {
      if (key in body) update[key] = body[key];
    }
    if ("duration" in body) update.duration = Number(body.duration || 0);
    if ("totalMarks" in body) update.totalMarks = Number(body.totalMarks || 0);
    if ("passingMarks" in body) update.passingMarks = Number(body.passingMarks || 0);
    if ("attempts" in body) update.attempts = Number(body.attempts || 1);

    if ("startDate" in body) {
      update.startDate = body.startDate ? new Date(String(body.startDate)) : null;
    }
    if ("endDate" in body) {
      update.endDate = body.endDate ? new Date(String(body.endDate)) : null;
    }

    const nextStart =
      "startDate" in update
        ? (update.startDate as Date | null)
        : (existing.startDate as Date | undefined);
    const nextEnd =
      "endDate" in update
        ? (update.endDate as Date | null)
        : (existing.endDate as Date | undefined);
    const dateError = validateExamDateOrder(nextStart, nextEnd);
    if (dateError) {
      return NextResponse.json({ success: false, error: dateError }, { status: 400 });
    }

    if ("course" in body && typeof body.course === "string" && body.course.trim()) {
      const courseResult = await resolveLiveCourseForStaff({
        courseId: body.course.trim(),
        userId: auth.user.id,
        role: auth.user.role,
      });
      if (!courseResult.ok) {
        return NextResponse.json(
          { success: false, error: courseResult.error },
          { status: courseResult.status },
        );
      }
      update.course = courseResult.meta.courseId;
      update.subject = courseResult.meta.subjectName;
      update.subjectCode = courseResult.meta.subjectCode;
      update.grade = courseResult.meta.grade;
    }

    if ("componentId" in body && typeof body.componentId === "string" && body.componentId.trim()) {
      const { resolveSubjectComponent } = await import("@/app/api/_lib/subjects");
      const courseMeta =
        "course" in update
          ? {
              subjectId: undefined as string | undefined,
              subjectName: update.subject as string | undefined,
              subjectCode: update.subjectCode as string | undefined,
            }
          : {
              subjectId: undefined as string | undefined,
              subjectName: existing.subject as string | undefined,
              subjectCode: existing.subjectCode as string | undefined,
            };
      // Prefer course subjectId when course was just resolved
      if ("course" in body && typeof body.course === "string") {
        const courseResult = await resolveLiveCourseForStaff({
          courseId: body.course.trim(),
          userId: auth.user.id,
          role: auth.user.role,
        });
        if (courseResult.ok) {
          courseMeta.subjectId = courseResult.meta.subjectId;
          courseMeta.subjectName = courseResult.meta.subjectName;
          courseMeta.subjectCode = courseResult.meta.subjectCode;
        }
      } else if (existing.course) {
        const courseResult = await resolveLiveCourseForStaff({
          courseId: String(existing.course),
          userId: auth.user.id,
          role: auth.user.role,
        });
        if (courseResult.ok) {
          courseMeta.subjectId = courseResult.meta.subjectId;
          courseMeta.subjectName = courseResult.meta.subjectName || courseMeta.subjectName;
          courseMeta.subjectCode = courseResult.meta.subjectCode || courseMeta.subjectCode;
        }
      }
      const resolved = await resolveSubjectComponent({
        subjectId: courseMeta.subjectId,
        subjectName: courseMeta.subjectName,
        subjectCode: courseMeta.subjectCode,
        componentId: body.componentId.trim(),
      });
      if ("error" in resolved) {
        return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
      }
      update.componentId = toObjectId(resolved.component._id!);
      update.componentName = resolved.component.name;
      update.type = resolved.component.type;
    }

    if (Array.isArray(body.questions)) {
      update.questions = body.questions.filter((x): x is string => typeof x === "string");
    }

    const wantsPublish =
      "isPublished" in body ? Boolean(body.isPublished) : Boolean(existing.isPublished);

    // Reconcile marks from attached questions when publishing or when client asks.
    if (body.reconcileMarks === true || wantsPublish) {
      const total = await reconcileExamTotalMarks(id);
      update.totalMarks = total > 0 ? total : Number(update.totalMarks ?? existing.totalMarks ?? 0);
    }

    const nextTotal =
      typeof update.totalMarks === "number"
        ? update.totalMarks
        : Number(existing.totalMarks || 0);
    const nextPassing =
      typeof update.passingMarks === "number"
        ? update.passingMarks
        : Number(existing.passingMarks || 0);

    if (nextPassing > nextTotal) {
      return NextResponse.json(
        { success: false, error: "passingMarks cannot be greater than totalMarks" },
        { status: 400 },
      );
    }

    if (wantsPublish && !existing.isPublished) {
      const publishError = await assertCanPublishExam(id);
      if (publishError) {
        return NextResponse.json({ success: false, error: publishError }, { status: 400 });
      }
      if (nextTotal <= 0) {
        return NextResponse.json(
          { success: false, error: "Exam must have questions with marks before publishing" },
          { status: 400 },
        );
      }
    }

    if ("isPublished" in body) {
      update.isPublished = Boolean(body.isPublished);
    }

    const updated = await Exam.findByIdAndUpdate(examOid, update, {
      new: true,
      runValidators: true,
    })
      .populate("course", "title")
      .lean();
    return NextResponse.json({ success: true, data: mapExam(updated) });
  } catch (error) {
    console.error("Exams by id PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update exam" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid exam id" }, { status: 400 });
    }

    const examOid = toObjectId(id);
    let filter: Record<string, unknown>;
    if (auth.user.role === "instructor") {
      const scope = await instructorExamAccessMatch(auth.user.id);
      filter = { $and: [{ _id: examOid }, scope] };
    } else {
      filter = { _id: examOid };
    }

    const removed = await Exam.findOneAndDelete(filter).lean();
    if (!removed) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }
    await Question.deleteMany({ exam: removed._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Exams by id DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete exam" }, { status: 500 });
  }
}
