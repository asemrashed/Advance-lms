import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import BatchEnrollment from "@/models/BatchEnrollment";
import { requireSessionUser } from "@/app/api/_lib/phase12";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["super_admin"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid enrollment id" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "").trim();

    if (action !== "activate" && action !== "note") {
      return NextResponse.json(
        { success: false, error: 'action must be "activate" or "note"' },
        { status: 400 },
      );
    }

    await connectDB();

    const enrollment = await BatchEnrollment.findById(id);
    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: "Batch enrollment not found" },
        { status: 404 },
      );
    }

    if (enrollment.paymentStatus !== "paid" || enrollment.status !== "suspended") {
      return NextResponse.json(
        {
          success: false,
          error: "Only paid + suspended enrollments can be reconciled here",
        },
        { status: 400 },
      );
    }

    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 2000)
        : undefined;

    if (action === "activate") {
      enrollment.status = "active";
      if (note) {
        enrollment.reconcileNote = note;
      } else if (!enrollment.reconcileNote) {
        enrollment.reconcileNote = `Activated by admin ${auth.user.id} (capacity override)`;
      }
      await enrollment.save();

      return NextResponse.json({
        success: true,
        data: {
          id: String(enrollment._id),
          status: enrollment.status,
          paymentStatus: enrollment.paymentStatus,
          reconcileNote: enrollment.reconcileNote,
        },
      });
    }

    if (!note) {
      return NextResponse.json(
        { success: false, error: "note is required for note action" },
        { status: 400 },
      );
    }

    enrollment.reconcileNote = note;
    await enrollment.save();

    return NextResponse.json({
      success: true,
      data: {
        id: String(enrollment._id),
        status: enrollment.status,
        paymentStatus: enrollment.paymentStatus,
        reconcileNote: enrollment.reconcileNote,
      },
    });
  } catch (error) {
    console.error("PATCH batch-enrollment reconcile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reconcile batch enrollment" },
      { status: 500 },
    );
  }
}
