import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ContentApprovalRequest from "@/models/ContentApprovalRequest";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import { requireAdminPermission } from "@/app/api/_lib/adminPermissions";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const auth = await requireAdminPermission("accept_course_requests");
  if (auth.error) return { error: auth.error };
  return { userId: auth.user!.id };
}

/** PATCH /api/admin/content-requests/[id] — approve or reject */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid request ID" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "").trim();

    const row = await ContentApprovalRequest.findById(id);
    if (!row) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 },
      );
    }
    if (row.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Request already reviewed" },
        { status: 409 },
      );
    }

    const rejectionNote =
      typeof body.rejectionNote === "string" ? body.rejectionNote.trim() : "";
    const reviewedBy = new mongoose.Types.ObjectId(auth.userId);
    const reviewedAt = new Date();

    if (action === "approve") {
      if (row.type === "course") {
        const course = await Course.findByIdAndUpdate(row.courseId, {
          $set: { status: "published" },
        });
        if (!course) {
          return NextResponse.json(
            { success: false, error: "Course not found for this request" },
            { status: 404 },
          );
        }
        // Approve duplicate pending requests for the same course
        await ContentApprovalRequest.updateMany(
          {
            type: "course",
            courseId: row.courseId,
            status: "pending",
          },
          {
            $set: {
              status: "approved",
              reviewedBy,
              reviewedAt,
            },
          },
        );
      } else if (row.type === "batch" && row.batchId) {
        await Batch.findByIdAndUpdate(row.batchId, {
          $set: { approvalStatus: "approved", isActive: true },
        });
        row.status = "approved";
        row.reviewedBy = reviewedBy;
        row.reviewedAt = reviewedAt;
        await row.save();
      } else {
        row.status = "approved";
        row.reviewedBy = reviewedBy;
        row.reviewedAt = reviewedAt;
        await row.save();
      }

      return NextResponse.json({ success: true, data: { status: "approved" } });
    }

    if (action === "reject") {
      if (row.type === "course") {
        await Course.findByIdAndUpdate(row.courseId, {
          $set: { status: "draft" },
        });
        await ContentApprovalRequest.updateMany(
          {
            type: "course",
            courseId: row.courseId,
            status: "pending",
          },
          {
            $set: {
              status: "rejected",
              reviewedBy,
              reviewedAt,
              rejectionNote: rejectionNote || undefined,
            },
          },
        );
      } else if (row.type === "batch" && row.batchId) {
        await Batch.findByIdAndUpdate(row.batchId, {
          $set: { approvalStatus: "rejected", isActive: false },
        });
        row.status = "rejected";
        row.reviewedBy = reviewedBy;
        row.reviewedAt = reviewedAt;
        row.rejectionNote = rejectionNote || undefined;
        await row.save();
      } else {
        row.status = "rejected";
        row.reviewedBy = reviewedBy;
        row.reviewedAt = reviewedAt;
        row.rejectionNote = rejectionNote || undefined;
        await row.save();
      }

      return NextResponse.json({ success: true, data: { status: "rejected" } });
    }

    return NextResponse.json(
      { success: false, error: "action must be approve or reject" },
      { status: 400 },
    );
  } catch (error) {
    console.error("PATCH /api/admin/content-requests/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/content-requests/[id] — remove request; revert pending course to draft */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid request ID" },
        { status: 400 },
      );
    }

    const row = await ContentApprovalRequest.findById(id);
    if (!row) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 },
      );
    }

    if (row.status === "pending") {
      if (row.type === "course") {
        // Deleting a pending request must not leave the course stuck as pending_approval
        await Course.findByIdAndUpdate(row.courseId, {
          $set: { status: "draft" },
        });
      } else if (row.type === "batch" && row.batchId) {
        await Batch.findByIdAndDelete(row.batchId);
      }
    }

    await ContentApprovalRequest.findByIdAndDelete(id);

    return NextResponse.json({ success: true, data: { _id: id } });
  } catch (error) {
    console.error("DELETE /api/admin/content-requests/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete request" },
      { status: 500 },
    );
  }
}
