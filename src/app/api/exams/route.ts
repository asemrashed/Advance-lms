import { NextRequest, NextResponse } from "next/server";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import Question from "@/models/Question";
import {
  instructorExamAccessMatch,
  isObjectId,
  pagination,
  parseLimit,
  parsePage,
  requireSessionUser,
  toObjectId,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import {
  resolveLiveCourseForStaff,
  validateExamDateOrder,
} from "@/app/api/_lib/examHelpers";

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 10, 500);
    const skip = (page - 1) * limit;
    const search = (searchParams.get("search") || "").trim();
    const type = (searchParams.get("type") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const sortBy = (searchParams.get("sortBy") || "createdAt").trim();
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};
    if (auth.user.role === "instructor") {
      const scope = await instructorExamAccessMatch(auth.user.id);
      if (search) {
        filter.$and = [
          scope,
          {
            $or: [
              { title: { $regex: escapeRegex(search), $options: "i" } },
              { description: { $regex: escapeRegex(search), $options: "i" } },
            ],
          },
        ];
      } else {
        Object.assign(filter, scope);
      }
    } else if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (type && type !== "all") filter.type = type;
    if (status === "draft") filter.isPublished = false;
    if (status === "published") filter.isPublished = true;
    if (status === "inactive") filter.isActive = false;
    if (status === "active") {
      filter.isPublished = true;
      filter.isActive = true;
    }
    const isPublishedParam = searchParams.get("isPublished");
    if (isPublishedParam === "true") filter.isPublished = true;
    if (isPublishedParam === "false") filter.isPublished = false;
    const isActiveParam = searchParams.get("isActive");
    if (isActiveParam === "true") filter.isActive = true;
    if (isActiveParam === "false") filter.isActive = false;
    const courseParam = (searchParams.get("course") || "").trim();
    const gradeParam = (searchParams.get("grade") || "").trim();
    const subjectParam = (searchParams.get("subject") || "").trim();
    const batchParam = (searchParams.get("batch") || "").trim();

    if (batchParam && isObjectId(batchParam)) {
      const Batch = (await import("@/models/Batch")).default;
      const batchDoc = await Batch.findById(batchParam).select("courseId").lean();
      if (batchDoc?.courseId) {
        filter.course = batchDoc.courseId;
      }
    } else if (courseParam && courseParam !== "all" && isObjectId(courseParam)) {
      filter.course = toObjectId(courseParam);
    }
    if (gradeParam && gradeParam !== "all") filter.grade = gradeParam;
    if (subjectParam && subjectParam !== "all") {
      const subjectClause = {
        $or: [
          { subject: { $regex: escapeRegex(subjectParam), $options: "i" } },
          { subjectCode: { $regex: escapeRegex(subjectParam), $options: "i" } },
        ],
      };
      if (filter.$and && Array.isArray(filter.$and)) {
        (filter.$and as unknown[]).push(subjectClause);
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, subjectClause];
        delete filter.$or;
      } else {
        Object.assign(filter, subjectClause);
      }
    }
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [rows, total, examIdList, typeBreakdown] = await Promise.all([
      Exam.find(filter).populate("course", "title").sort(sort).skip(skip).limit(limit).lean(),
      Exam.countDocuments(filter),
      Exam.distinct("_id", filter),
      Exam.aggregate([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
    ]);

    const [attemptScoreRows, totalAttempts] = await Promise.all([
      examIdList.length
        ? ExamAttempt.aggregate([
            { $match: { exam: { $in: examIdList }, status: "completed" } },
            {
              $group: {
                _id: null,
                avgPct: { $avg: "$percentage" },
                passed: { $sum: { $cond: ["$isPassed", 1, 0] } },
                total: { $sum: 1 },
              },
            },
          ])
        : Promise.resolve([]),
      examIdList.length
        ? ExamAttempt.countDocuments({ exam: { $in: examIdList } })
        : Promise.resolve(0),
    ]);

    const examsByType = { mcq: 0, written: 0, mixed: 0 };
    for (const row of typeBreakdown as Array<{ _id: string; count: number }>) {
      const k = row._id;
      if (k === "mcq" || k === "written" || k === "mixed") {
        examsByType[k] = Number(row.count || 0);
      }
    }

    const scoreAgg = (attemptScoreRows as Array<{ avgPct?: number; passed?: number; total?: number }>)[0];
    const completedForRate = Number(scoreAgg?.total || 0);
    const averageScore = completedForRate > 0 ? Number(scoreAgg?.avgPct || 0) : 0;
    const passRate =
      completedForRate > 0 ? (Number(scoreAgg?.passed || 0) / completedForRate) * 100 : 0;

    const exams = rows.map(mapExam);
    const ids = rows.map((r) => r._id);
    const questionCount = ids.length
      ? await Question.countDocuments({ exam: { $in: ids } })
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        exams,
        pagination: pagination(page, limit, total),
        stats: {
          totalExams: total,
          activeExams: exams.filter((e) => e.status === "active").length,
          draftExams: exams.filter((e) => e.status === "draft").length,
          publishedExams: exams.filter((e) => e.status !== "draft").length,
          totalQuestions: questionCount,
          totalAttempts,
          averageScore,
          passRate,
          examsByType,
        },
      },
    });
  } catch (error) {
    console.error("Exams GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch exams" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
    }

    const courseId = typeof body.course === "string" ? body.course.trim() : "";
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "Live course is required" },
        { status: 400 },
      );
    }

    const courseResult = await resolveLiveCourseForStaff({
      courseId,
      userId: auth.user.id,
      role: auth.user.role,
    });
    if (!courseResult.ok) {
      return NextResponse.json(
        { success: false, error: courseResult.error },
        { status: courseResult.status },
      );
    }

    const totalMarks = Math.max(1, Number(body.totalMarks || 1));
    const passingMarks = Number(body.passingMarks || 0);
    const duration = Number(body.duration || 0);
    if (duration <= 0) {
      return NextResponse.json(
        { success: false, error: "duration must be greater than zero" },
        { status: 400 },
      );
    }
    if (passingMarks > totalMarks) {
      return NextResponse.json(
        { success: false, error: "passingMarks cannot be greater than totalMarks" },
        { status: 400 },
      );
    }

    const startDate = body.startDate ? new Date(String(body.startDate)) : undefined;
    const endDate = body.endDate ? new Date(String(body.endDate)) : undefined;
    const dateError = validateExamDateOrder(startDate, endDate);
    if (dateError) {
      return NextResponse.json({ success: false, error: dateError }, { status: 400 });
    }

    const isPublished = Boolean(body.isPublished);
    if (isPublished) {
      return NextResponse.json(
        {
          success: false,
          error: "Create the exam as a draft first, then add questions before publishing",
        },
        { status: 400 },
      );
    }

    const questionIds = Array.isArray(body.questions)
      ? body.questions.filter((x): x is string => typeof x === "string")
      : [];

    const componentId = String(body.componentId || "").trim();
    if (!componentId) {
      return NextResponse.json(
        { success: false, error: "Exam component is required" },
        { status: 400 },
      );
    }

    const { resolveSubjectComponent } = await import("@/app/api/_lib/subjects");
    const resolved = await resolveSubjectComponent({
      subjectId: courseResult.meta.subjectId,
      subjectName: courseResult.meta.subjectName,
      subjectCode: courseResult.meta.subjectCode,
      componentId,
    });
    if ("error" in resolved) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
    }

    const examType = resolved.component.type;

    const created = await Exam.create({
      title,
      description: String(body.description || "").trim() || undefined,
      type: examType,
      duration,
      totalMarks,
      passingMarks,
      instructions: String(body.instructions || "").trim() || undefined,
      startDate,
      endDate,
      course: courseResult.meta.courseId,
      subject: courseResult.meta.subjectName || resolved.subjectName,
      subjectCode: courseResult.meta.subjectCode || resolved.subjectCode,
      grade: courseResult.meta.grade,
      componentId: toObjectId(resolved.component._id!),
      componentName: resolved.component.name,
      createdBy: toObjectId(auth.user.id),
      questions: questionIds,
      attempts: Number(body.attempts || 1),
      shuffleQuestions: Boolean(body.shuffleQuestions),
      shuffleOptions: Boolean(body.shuffleOptions),
      showCorrectAnswers: body.showCorrectAnswers !== false,
      showResults: body.showResults !== false,
      allowReview: body.allowReview !== false,
      timeLimit: body.timeLimit !== false,
      isActive: body.isActive !== false,
      isPublished: false,
    });

    const row = await Exam.findById(created._id).populate("course", "title").lean();
    return NextResponse.json({ success: true, data: mapExam(row) });
  } catch (error) {
    console.error("Exams POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create exam" }, { status: 500 });
  }
}
