import { NextRequest, NextResponse } from "next/server";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Enrollment from "@/models/Enrollment";
import { isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";
import { normalizeMcqQuestions } from "@/lib/assignments/validation";
import {
  instructorAccessibleCourseIds,
  instructorCanAccessCourse,
} from "@/app/api/_lib/instructorCourses";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

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

async function loadAssignmentForUser(id: string, userId: string, role: string) {
  const filter: Record<string, unknown> = { _id: id };
  if (role === "instructor") {
    const courseIds = await instructorAccessibleCourseIds(userId);
    filter.$or = [
      { createdBy: toObjectId(userId) },
      { course: { $in: courseIds } },
    ];
  }
  return Assignment.findOne(filter);
}

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

    const assignment = await Assignment.findById(id)
      .populate("course", "title")
      .populate("createdBy", "name email")
      .lean();
    if (!assignment) return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });

    if (auth.user.role === "student") {
      const allowed = await Enrollment.exists({
        student: auth.user.id,
        course: assignment.course?._id || assignment.course,
        status: { $in: ["enrolled", "in_progress", "completed"] },
      });
      if (!allowed) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (auth.user.role === "instructor") {
      const allowedCourse = await instructorCanAccessCourse(
        auth.user.id,
        String(assignment.course?._id || assignment.course),
      );
      if (!allowedCourse) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: { assignment } });
  } catch (error) {
    console.error("Assignment by id GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch assignment" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

    const assignment = await loadAssignmentForUser(id, auth.user.id, auth.user.role);
    if (!assignment) return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;

    const fields = [
      "title",
      "description",
      "instructions",
      "type",
      "course",
      "chapter",
      "lesson",
      "totalMarks",
      "passingMarks",
      "dueDate",
      "startDate",
      "isActive",
      "isPublished",
      "allowLateSubmission",
      "latePenaltyPercentage",
      "maxAttempts",
      "allowedFileTypes",
      "maxFileSize",
      "attachments",
      "rubric",
      "mcqQuestions",
      "isGroupAssignment",
      "maxGroupSize",
      "autoGrade",
      "timeLimit",
      "showCorrectAnswers",
      "allowReview",
      "status",
    ] as const;
    for (const field of fields) {
      if (field in body) (assignment as any)[field] = body[field];
    }
    if ("mcqQuestions" in body) {
      assignment.mcqQuestions = normalizeMcqQuestions(body.mcqQuestions) as any;
    }
    if (assignment.type === "mcq" && assignment.mcqQuestions?.length) {
      const mcqTotal = assignment.mcqQuestions.reduce(
        (sum: number, q: { marks?: number }) => sum + Number(q.marks || 0),
        0,
      );
      if (mcqTotal > 0) {
        assignment.totalMarks = mcqTotal;
        if (assignment.passingMarks > mcqTotal) {
          assignment.passingMarks = Math.floor(mcqTotal / 2);
        }
      }
    }
    if (assignment.type === "pdf") {
      assignment.allowedFileTypes = [".pdf"];
      if (!assignment.maxFileSize) assignment.maxFileSize = 50;
    }
    if (
      typeof assignment.totalMarks === "number" &&
      typeof assignment.passingMarks === "number" &&
      assignment.passingMarks > assignment.totalMarks
    ) {
      return NextResponse.json(
        { success: false, error: "passingMarks cannot be greater than totalMarks" },
        { status: 400 },
      );
    }
    if (!("status" in body)) {
      assignment.status = computeAssignmentStatus({
        isActive: assignment.isActive,
        isPublished: assignment.isPublished,
        startDate: assignment.startDate,
        dueDate: assignment.dueDate,
      }) as any;
    }
    await assignment.save();
    return NextResponse.json({ success: true, data: assignment.toObject() });
  } catch (error) {
    console.error("Assignment by id PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

    const assignment = await loadAssignmentForUser(id, auth.user.id, auth.user.role);
    if (!assignment) return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    await AssignmentSubmission.deleteMany({ assignment: assignment._id });
    await Assignment.deleteOne({ _id: assignment._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assignment by id DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete assignment" }, { status: 500 });
  }
}
