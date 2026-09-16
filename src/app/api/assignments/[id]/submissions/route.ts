import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Course from "@/models/Course";
import { pagination, parseLimit, parsePage, requireSessionUser } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

async function checkStaffAccess(assignmentId: string, userId: string, role: string) {
  if (isAdminAreaRole(role)) return true;
  const assignment = await Assignment.findById(assignmentId).select("course").lean();
  if (!assignment) return false;
  const allowed = await Course.exists({
    _id: assignment.course,
    $or: [{ instructor: userId }, { createdBy: userId }],
  });
  return Boolean(allowed);
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid assignment id" }, { status: 400 });
    }

    const allowed = await checkStaffAccess(id, auth.user.id, auth.user.role);
    if (!allowed) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const submissionId = (searchParams.get("submissionId") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const sortBy = (searchParams.get("sortBy") || "submittedAt").trim();
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const isLate = searchParams.get("isLate");
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 10, 200);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { assignment: new mongoose.Types.ObjectId(id) };
    if (submissionId && mongoose.Types.ObjectId.isValid(submissionId)) filter._id = new mongoose.Types.ObjectId(submissionId);
    if (status && status !== "all") filter.status = status;
    if (isLate === "true") filter.isLate = true;
    if (isLate === "false") filter.isLate = false;

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };
    const [rows, total] = await Promise.all([
      AssignmentSubmission.find(filter)
        .populate("student", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      AssignmentSubmission.countDocuments(filter),
    ]);

    const statsAgg = await AssignmentSubmission.aggregate([
      { $match: { assignment: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          submittedSubmissions: { $sum: { $cond: [{ $eq: ["$status", "submitted"] }, 1, 0] } },
          gradedSubmissions: { $sum: { $cond: [{ $eq: ["$status", "graded"] }, 1, 0] } },
          averageScore: { $avg: "$score" },
          lateSubmissions: { $sum: { $cond: [{ $eq: ["$isLate", true] }, 1, 0] } },
        },
      },
    ]);
    const stats = statsAgg[0] || {
      totalSubmissions: 0,
      submittedSubmissions: 0,
      gradedSubmissions: 0,
      averageScore: 0,
      lateSubmissions: 0,
    };
    const passRate =
      stats.totalSubmissions > 0
        ? Number((((stats.gradedSubmissions || 0) / stats.totalSubmissions) * 100).toFixed(2))
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        submissions: rows,
        pagination: pagination(page, limit, total),
        stats: {
          ...stats,
          averageScore: Number(stats.averageScore || 0),
          passRate,
        },
      },
    });
  } catch (error) {
    console.error("Assignment submissions GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch submissions" }, { status: 500 });
  }
}
