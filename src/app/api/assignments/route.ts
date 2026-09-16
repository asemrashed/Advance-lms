import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Course from "@/models/Course";
import {
  pagination,
  parseLimit,
  parsePage,
  requireSessionUser,
  toObjectId,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import {
  defaultAllowedFileTypesForType,
  normalizeMcqQuestions,
} from "@/lib/assignments/validation";
import {
  instructorAccessibleCourseIds,
  instructorCanAccessCourse,
} from "@/app/api/_lib/instructorCourses";

function computeAssignmentStatus(input: {
  isPublished?: boolean;
  isActive?: boolean;
  startDate?: Date | string;
  dueDate?: Date | string;
}) {
  if (!input.isPublished) return "draft";
  if (!input.isActive) return "inactive";
  const now = Date.now();
  if (input.startDate && new Date(input.startDate).getTime() > now) return "scheduled";
  if (input.dueDate && new Date(input.dueDate).getTime() < now) return "expired";
  return "active";
}

function mapAssignment(row: any) {
  return {
    _id: String(row._id),
    title: row.title,
    description: row.description || "",
    instructions: row.instructions || "",
    type: row.type,
    course: row.course || undefined,
    chapter: row.chapter || undefined,
    lesson: row.lesson || undefined,
    subject: row.subject || undefined,
    grade: row.grade || undefined,
    createdBy: row.createdBy || undefined,
    totalMarks: row.totalMarks,
    passingMarks: row.passingMarks,
    dueDate: row.dueDate || undefined,
    startDate: row.startDate || undefined,
    isActive: row.isActive !== false,
    isPublished: Boolean(row.isPublished),
    allowLateSubmission: Boolean(row.allowLateSubmission),
    latePenaltyPercentage: row.latePenaltyPercentage || 0,
    maxAttempts: Number(row.maxAttempts || 1),
    allowedFileTypes: Array.isArray(row.allowedFileTypes) ? row.allowedFileTypes : [],
    maxFileSize: row.maxFileSize || undefined,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    rubric: Array.isArray(row.rubric) ? row.rubric : [],
    mcqQuestions: Array.isArray(row.mcqQuestions) ? row.mcqQuestions : [],
    isGroupAssignment: Boolean(row.isGroupAssignment),
    maxGroupSize: row.maxGroupSize || undefined,
    autoGrade: Boolean(row.autoGrade),
    timeLimit: row.timeLimit || undefined,
    showCorrectAnswers: row.showCorrectAnswers !== false,
    allowReview: row.allowReview !== false,
    status: row.status || computeAssignmentStatus(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 10, 200);
    const skip = (page - 1) * limit;
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const type = (searchParams.get("type") || "").trim();
    const course = (searchParams.get("course") || "").trim();
    const grade = (searchParams.get("grade") || "").trim();
    const subject = (searchParams.get("subject") || "").trim();
    const batch = (searchParams.get("batch") || "").trim();
    const sortBy = (searchParams.get("sortBy") || "createdAt").trim();
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};
    const andClauses: Record<string, unknown>[] = [];

    if (auth.user.role === "instructor") {
      const instructorId = toObjectId(auth.user.id);
      const taughtCourseIds = await instructorAccessibleCourseIds(auth.user.id);
      andClauses.push({
        $or: [{ createdBy: instructorId }, { course: { $in: taughtCourseIds } }],
      });
    }
    if (search) {
      andClauses.push({
        $or: [
          { title: { $regex: escapeRegex(search), $options: "i" } },
          { description: { $regex: escapeRegex(search), $options: "i" } },
          { subject: { $regex: escapeRegex(search), $options: "i" } },
        ],
      });
    }
    if (status && status !== "all") filter.status = status;
    if (type && type !== "all") filter.type = type;

    let courseId = course;
    if (batch && mongoose.Types.ObjectId.isValid(batch)) {
      const Batch = (await import("@/models/Batch")).default;
      const batchDoc = await Batch.findById(batch).select("courseId").lean();
      if (batchDoc?.courseId) {
        courseId = String(batchDoc.courseId);
      }
    }
    if (courseId && courseId !== "all" && mongoose.Types.ObjectId.isValid(courseId)) {
      filter.course = new mongoose.Types.ObjectId(courseId);
    }
    if (grade && grade !== "all") filter.grade = grade;
    if (subject && subject !== "all") {
      andClauses.push({
        $or: [
          { subject: { $regex: escapeRegex(subject), $options: "i" } },
          { subjectCode: { $regex: escapeRegex(subject), $options: "i" } },
        ],
      });
    }
    if (andClauses.length) filter.$and = andClauses;

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };
    const [rows, total] = await Promise.all([
      Assignment.find(filter)
        .populate("course", "title")
        .populate("createdBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Assignment.countDocuments(filter),
    ]);

    const assignmentIds = rows.map((x) => x._id);
    const submissionStats = assignmentIds.length
      ? await AssignmentSubmission.aggregate([
          { $match: { assignment: { $in: assignmentIds } } },
          {
            $group: {
              _id: "$assignment",
              total: { $sum: 1 },
              graded: {
                $sum: {
                  $cond: [{ $eq: ["$status", "graded"] }, 1, 0],
                },
              },
              late: {
                $sum: {
                  $cond: [{ $eq: ["$isLate", true] }, 1, 0],
                },
              },
              passed: {
                $sum: {
                  $cond: [{ $eq: ["$passed", true] }, 1, 0],
                },
              },
              scoreTotal: {
                $sum: {
                  $cond: [{ $eq: ["$status", "graded"] }, { $ifNull: ["$score", 0] }, 0],
                },
              },
            },
          },
        ])
      : [];
    const statMap = new Map<
      string,
      { total: number; graded: number; late: number; passed: number; scoreTotal: number }
    >();
    submissionStats.forEach((x) =>
      statMap.set(String(x._id), {
        total: Number(x.total || 0),
        graded: Number(x.graded || 0),
        late: Number(x.late || 0),
        passed: Number(x.passed || 0),
        scoreTotal: Number(x.scoreTotal || 0),
      }),
    );

    const assignments = rows.map((row) => ({
      ...mapAssignment(row),
      submissionCount: statMap.get(String(row._id))?.total || 0,
    }));

    const totalSubmissions = assignments.reduce((acc, row) => acc + Number(row.submissionCount || 0), 0);
    const gradedSubmissions = [...statMap.values()].reduce((acc, x) => acc + x.graded, 0);
    const lateSubmissions = [...statMap.values()].reduce((acc, x) => acc + x.late, 0);
    const passedSubmissions = [...statMap.values()].reduce((acc, x) => acc + x.passed, 0);
    const scoreTotal = [...statMap.values()].reduce((acc, x) => acc + x.scoreTotal, 0);
    const averageScore = gradedSubmissions > 0 ? scoreTotal / gradedSubmissions : 0;
    const passRate = gradedSubmissions > 0 ? (passedSubmissions / gradedSubmissions) * 100 : 0;
    const publishedAssignments = assignments.filter((x) => Boolean(x.isPublished)).length;
    const draftAssignments = assignments.filter((x) => !x.isPublished).length;
    const activeAssignments = assignments.filter((x) => x.status === "active").length;
    const assignmentsByType = assignments.reduce<Record<string, number>>((acc, row) => {
      const key = String(row.type || "essay");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        assignments,
        pagination: pagination(page, limit, total),
        stats: {
          totalAssignments: total,
          publishedAssignments,
          draftAssignments,
          activeAssignments,
          totalSubmissions,
          gradedSubmissions,
          averageScore,
          passRate,
          lateSubmissions,
          assignmentsByType,
        },
      },
    });
  } catch (error) {
    console.error("Assignments GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch assignments" }, { status: 500 });
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
    const courseId = String(body.course || "");
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ success: false, error: "Valid course is required" }, { status: 400 });
    }
    const course = await Course.findById(courseId)
      .select("_id instructor createdBy subjectName grade")
      .lean();
    if (!course) {
      return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
    }
    if (auth.user.role === "instructor") {
      const allowed = await instructorCanAccessCourse(auth.user.id, courseId);
      if (!allowed) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const totalMarks = Number(body.totalMarks || 0);
    const passingMarks = Number(body.passingMarks || 0);
    if (totalMarks <= 0 || passingMarks > totalMarks) {
      return NextResponse.json(
        { success: false, error: "Invalid totalMarks/passingMarks" },
        { status: 400 },
      );
    }

    const isActive = body.isActive !== false;
    const isPublished = Boolean(body.isPublished);
    const startDate = body.startDate ? new Date(String(body.startDate)) : undefined;
    const dueDate = body.dueDate ? new Date(String(body.dueDate)) : undefined;

    const allowedTypes = new Set([
      "pdf",
      "mcq",
      "essay",
      "file_upload",
      "quiz",
      "project",
      "presentation",
    ]);
    const type = allowedTypes.has(String(body.type || ""))
      ? String(body.type)
      : "pdf";
    const mcqQuestions = normalizeMcqQuestions(body.mcqQuestions);
    if (type === "mcq" && mcqQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one valid MCQ question is required" },
        { status: 400 },
      );
    }
    const mcqTotalMarks = mcqQuestions.reduce((sum, q) => sum + q.marks, 0);
    const resolvedTotalMarks = type === "mcq" && mcqTotalMarks > 0 ? mcqTotalMarks : totalMarks;
    const resolvedPassingMarks =
      type === "mcq" && passingMarks > resolvedTotalMarks
        ? Math.floor(resolvedTotalMarks / 2)
        : passingMarks;
    if (resolvedPassingMarks > resolvedTotalMarks) {
      return NextResponse.json(
        { success: false, error: "Invalid totalMarks/passingMarks" },
        { status: 400 },
      );
    }

    const created = await Assignment.create({
      title,
      description: String(body.description || "").trim() || undefined,
      instructions: String(body.instructions || "").trim() || undefined,
      type,
      course: new mongoose.Types.ObjectId(courseId),
      subject: String((course as { subjectName?: string }).subjectName || body.subject || "").trim() || undefined,
      grade: String((course as { grade?: string }).grade || body.grade || "").trim().toUpperCase() || undefined,
      chapter:
        typeof body.chapter === "string" && mongoose.Types.ObjectId.isValid(body.chapter)
          ? new mongoose.Types.ObjectId(body.chapter)
          : undefined,
      lesson:
        typeof body.lesson === "string" && mongoose.Types.ObjectId.isValid(body.lesson)
          ? new mongoose.Types.ObjectId(body.lesson)
          : undefined,
      createdBy: toObjectId(auth.user.id),
      totalMarks: resolvedTotalMarks,
      passingMarks: resolvedPassingMarks,
      dueDate,
      startDate,
      isActive,
      isPublished,
      allowLateSubmission: Boolean(body.allowLateSubmission),
      latePenaltyPercentage: Number(body.latePenaltyPercentage || 0) || undefined,
      maxAttempts: Number(body.maxAttempts || 1),
      allowedFileTypes:
        Array.isArray(body.allowedFileTypes) && body.allowedFileTypes.length > 0
          ? body.allowedFileTypes
          : defaultAllowedFileTypesForType(type),
      maxFileSize: Number(body.maxFileSize || 0) || (type === "pdf" ? 50 : undefined),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      rubric: Array.isArray(body.rubric) ? body.rubric : [],
      mcqQuestions,
      isGroupAssignment: Boolean(body.isGroupAssignment),
      maxGroupSize: Number(body.maxGroupSize || 0) || undefined,
      autoGrade: type === "mcq" ? body.autoGrade !== false : Boolean(body.autoGrade),
      timeLimit: Number(body.timeLimit || 0) || undefined,
      showCorrectAnswers: body.showCorrectAnswers !== false,
      allowReview: body.allowReview !== false,
      status:
        typeof body.status === "string" && body.status.trim()
          ? body.status
          : computeAssignmentStatus({ isActive, isPublished, startDate, dueDate }),
    });

    const row = await Assignment.findById(created._id)
      .populate("course", "title")
      .populate("createdBy", "name email")
      .lean();
    return NextResponse.json({ success: true, data: mapAssignment(row) });
  } catch (error) {
    console.error("Assignments POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create assignment" }, { status: 500 });
  }
}
