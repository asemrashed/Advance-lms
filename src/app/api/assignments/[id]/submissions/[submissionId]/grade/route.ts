import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Course from "@/models/Course";
import { requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";

interface RouteCtx {
  params: Promise<{ id: string; submissionId: string }>;
}

async function checkAccess(assignmentId: string, userId: string, role: string) {
  if (isAdminAreaRole(role)) return true;
  const assignment = await Assignment.findById(assignmentId).select("course").lean();
  if (!assignment) return false;
  return Boolean(
    await Course.exists({
      _id: assignment.course,
      $or: [{ instructor: userId }, { createdBy: userId }],
    }),
  );
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id, submissionId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(submissionId)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    const allowed = await checkAccess(id, auth.user.id, auth.user.role);
    if (!allowed) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const assignment = await Assignment.findById(id).select("totalMarks passingMarks").lean();
    if (!assignment) return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    const body = (await request.json()) as { score?: number; feedback?: string; pdfAnnotations?: unknown };
    const score = Number(body.score);
    if (!Number.isFinite(score) || score < 0) {
      return NextResponse.json({ success: false, error: "Valid score is required" }, { status: 400 });
    }

    const submission = await AssignmentSubmission.findOne({
      _id: new mongoose.Types.ObjectId(submissionId),
      assignment: new mongoose.Types.ObjectId(id),
    });
    if (!submission) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }

    const maxScore = Number(assignment.totalMarks || submission.maxScore || 1);
    const boundedScore = Math.min(score, maxScore);
    const percentageScore = maxScore > 0 ? Number(((boundedScore / maxScore) * 100).toFixed(2)) : 0;
    const passed = boundedScore >= Number(assignment.passingMarks || 0);

    submission.status = "graded";
    submission.score = boundedScore;
    submission.maxScore = maxScore;
    submission.feedback = typeof body.feedback === "string" ? body.feedback : submission.feedback;
    if (body.pdfAnnotations && typeof body.pdfAnnotations === "object") {
      submission.pdfAnnotations = body.pdfAnnotations as typeof submission.pdfAnnotations;
    }
    submission.gradedBy = toObjectId(auth.user.id);
    submission.gradedAt = new Date();
    submission.percentageScore = percentageScore;
    submission.passed = passed;
    await submission.save();

    return NextResponse.json({ success: true, data: { submission: submission.toObject() } });
  } catch (error) {
    console.error("Assignment submission grade PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to grade submission" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  return PUT(request, ctx);
}
