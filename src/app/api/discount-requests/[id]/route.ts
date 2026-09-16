import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import DiscountRequest from "@/models/DiscountRequest";
import {
  approveDiscountRequest,
  canInstructorReviewDiscountRequest,
} from "@/app/api/_lib/discountRequests";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/discount-requests/[id] — approve or reject (admin or scoped instructor). */
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
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const approvedAmountRaw = body.approvedAmount;

    const row = await DiscountRequest.findById(id);
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
      const allowed = await canInstructorReviewDiscountRequest(row, auth.user.id);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
    }

    if (action === "approve") {
      const approvedAmount = Number(approvedAmountRaw);
      if (!Number.isFinite(approvedAmount) || approvedAmount < 0) {
        return NextResponse.json(
          { success: false, error: "Valid approved amount is required" },
          { status: 400 },
        );
      }
      if (approvedAmount > row.listPrice) {
        return NextResponse.json(
          {
            success: false,
            error: `Approved amount cannot exceed list price (${row.listPrice})`,
          },
          { status: 400 },
        );
      }
      await approveDiscountRequest(row, auth.user.id, approvedAmount, note);
      return NextResponse.json({
        success: true,
        data: { status: "approved", approvedAmount },
      });
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
    console.error("PATCH /api/discount-requests/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update discount request" },
      { status: 500 },
    );
  }
}
