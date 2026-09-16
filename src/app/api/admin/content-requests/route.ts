import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ContentApprovalRequest from "@/models/ContentApprovalRequest";
import { resolveCourseFinalPrice, coursePricingFromLean } from "@/lib/courses/liveCoursePricing";
import { syncOrphanedPendingCourses } from "@/app/api/_lib/contentApproval";
import { getDisplayName } from "@/lib/displayName";
import { requireAdminPermission } from "@/app/api/_lib/adminPermissions";

function mapRequest(row: Record<string, unknown>) {
  const course = row.courseId as Record<string, unknown> | null | undefined;
  const batch = row.batchId as Record<string, unknown> | null | undefined;
  const requester = row.requestedBy as Record<string, unknown> | null | undefined;

  const pricing = course ? coursePricingFromLean(course) : { isPaid: false };
  const price = course ? resolveCourseFinalPrice(pricing) : 0;

  const instructorName = requester
    ? String(requester.name || "").trim() ||
      getDisplayName(requester) ||
      String(requester.email || "")
    : "";

  const courseIdValue =
    course && course._id != null
      ? String(course._id)
      : row.courseId != null
        ? String(row.courseId)
        : "";

  const requestedByValue =
    requester && requester._id != null
      ? String(requester._id)
      : row.requestedBy != null
        ? String(row.requestedBy)
        : "";

  return {
    _id: String(row._id),
    type: row.type as "course" | "batch",
    status: row.status as "pending" | "approved" | "rejected",
    courseId: courseIdValue,
    courseName: String(course?.title ?? ""),
    batchId: batch ? String(batch._id ?? row.batchId) : undefined,
    batchName: batch ? String(batch.name ?? "") : undefined,
    instructorName,
    requestedBy: requestedByValue,
    price,
    isPaid: Boolean(pricing.isPaid),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    rejectionNote: row.rejectionNote ? String(row.rejectionNote) : undefined,
  };
}

/** GET /api/admin/content-requests — list course approval requests (batches are not approved) */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminPermission("accept_course_requests");
    if (auth.error) return auth.error;

    await connectDB();
    await syncOrphanedPendingCourses();

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "pending").trim();
    const type = (searchParams.get("type") || "course").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status !== "all") filter.status = status;
    // Phase 1: only course approvals; ignore legacy batch requests in the default list
    if (type === "batch") filter.type = "batch";
    else filter.type = "course";

    const [rows, total] = await Promise.all([
      ContentApprovalRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("courseId", "title isPaid price salePrice")
        .populate("batchId", "name")
        .populate("requestedBy", "name email")
        .lean(),
      ContentApprovalRequest.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requests: rows.map((r) => mapRequest(r as Record<string, unknown>)),
        pagination: {
          page,
          limit,
          total,
          pages: total > 0 ? Math.ceil(total / limit) : 0,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/admin/content-requests", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 },
    );
  }
}
