import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { requireAdminPermission } from "@/app/api/_lib/adminPermissions";
import EnrollmentRequest from "@/models/EnrollmentRequest";
import {
  approveEnrollmentRequest,
  canInstructorReviewRequest,
} from "@/app/api/_lib/enrollmentRequests";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/enrollment-requests/[id] — approve or reject (admin or scoped instructor). */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
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
    const rejectionNote =
      typeof body.rejectionNote === "string" ? body.rejectionNote.trim() : "";

    const row = await EnrollmentRequest.findById(id);
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

    if (auth.user.role === "instructor") {
      const allowed = await canInstructorReviewRequest(row, auth.user.id);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
    } else {
      const perm = await requireAdminPermission("review_enrollment_requests");
      if (perm.error) return perm.error;
    }

    if (action === "approve") {
      await approveEnrollmentRequest(row, auth.user.id);
      return NextResponse.json({ success: true, data: { status: "approved" } });
    }

    if (action === "reject") {
      row.status = "rejected";
      row.reviewedBy = new mongoose.Types.ObjectId(auth.user.id);
      row.reviewedAt = new Date();
      row.rejectionNote = rejectionNote || undefined;
      await row.save();
      return NextResponse.json({ success: true, data: { status: "rejected" } });
    }

    return NextResponse.json(
      { success: false, error: "action must be approve or reject" },
      { status: 400 },
    );
  } catch (error) {
    console.error("PATCH /api/enrollment-requests/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 },
    );
  }
}
