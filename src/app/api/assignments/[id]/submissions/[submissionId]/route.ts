import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Assignment from "@/models/Assignment";
import Course from "@/models/Course";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";
import { deleteSubmissionFiles } from "@/lib/submissionFiles";

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

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id, submissionId } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(submissionId)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    const allowed = await checkAccess(id, auth.user.id, auth.user.role);
    if (!allowed) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const submission = await AssignmentSubmission.findOne({
      _id: new mongoose.Types.ObjectId(submissionId),
      assignment: new mongoose.Types.ObjectId(id),
    })
      .select("files")
      .lean();

    if (submission?.files?.length) {
      await deleteSubmissionFiles(submission.files);
    }

    await AssignmentSubmission.deleteOne({
      _id: new mongoose.Types.ObjectId(submissionId),
      assignment: new mongoose.Types.ObjectId(id),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assignment submission DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete submission" }, { status: 500 });
  }
}
