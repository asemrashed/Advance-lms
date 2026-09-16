import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import Payment from "@/models/Payment";
import {
  getInstructorCourseIds,
  mapEnrollmentRow,
  requireInstructorJson,
} from "../_lib";

type RouteContext = { params: Promise<{ id: string }> };

async function loadAuthorizedEnrollment(
  enrollmentId: string,
  userId: string,
) {
  if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
    return { error: "Invalid enrollment ID", status: 400 as const };
  }

  const courseIds = await getInstructorCourseIds(userId);
  if (courseIds.length === 0) {
    return { error: "Enrollment not found", status: 404 as const };
  }

  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    course: { $in: courseIds },
  }).lean();

  if (!enrollment) {
    return { error: "Enrollment not found", status: 404 as const };
  }

  return { enrollment };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireInstructorJson();
    if ("error" in auth && auth.error) return auth.error;
    const userId = auth.userId!;
    const { id } = await context.params;

    await connectDB();
    const loaded = await loadAuthorizedEnrollment(id, userId);
    if ("error" in loaded) {
      return NextResponse.json(
        { success: false, error: loaded.error },
        { status: loaded.status },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    if (typeof body.status === "string") update.status = body.status;
    if (typeof body.progress === "number") update.progress = body.progress;
    if (typeof body.paymentStatus === "string") {
      if (
        body.paymentStatus === "paid" &&
        loaded.enrollment.paymentStatus !== "paid"
      ) {
        const transactionId = String(
          body.paymentId || loaded.enrollment.paymentId || "",
        ).trim();
        const verifiedPayment = transactionId
          ? await Payment.findOne({
              transactionId,
              status: "success",
              entityType: "course",
              user: loaded.enrollment.student,
              course: loaded.enrollment.course,
            })
              .select("_id")
              .lean()
          : null;

        if (!verifiedPayment) {
          return NextResponse.json(
            {
              success: false,
              error:
                "A successful matching gateway transaction is required before marking this enrollment paid",
            },
            { status: 409 },
          );
        }
      }
      update.paymentStatus = body.paymentStatus;
    }
    if (typeof body.paymentAmount === "number") {
      update.paymentAmount = body.paymentAmount;
    }
    if (typeof body.paymentMethod === "string") {
      update.paymentMethod = body.paymentMethod;
    }
    if (typeof body.paymentId === "string") update.paymentId = body.paymentId;
    if (typeof body.notes === "string") update.notes = body.notes;
    if (typeof body.accessBlocked === "boolean") {
      update.accessBlocked = body.accessBlocked;
    }
    if (typeof body.paymentDueAt === "string" || body.paymentDueAt === null) {
      update.paymentDueAt = body.paymentDueAt
        ? new Date(body.paymentDueAt as string)
        : null;
    }
    const updated = await Enrollment.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    )
      .populate({
        path: "course",
        select:
          "title shortDescription description thumbnailUrl category isPaid price",
      })
      .populate({
        path: "student",
        select: "name email avatar",
      })
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update enrollment" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: mapEnrollmentRow(updated as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("Instructor enrollment update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update enrollment" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireInstructorJson();
    if ("error" in auth && auth.error) return auth.error;
    const userId = auth.userId!;
    const { id } = await context.params;

    await connectDB();
    const loaded = await loadAuthorizedEnrollment(id, userId);
    if ("error" in loaded) {
      return NextResponse.json(
        { success: false, error: loaded.error },
        { status: loaded.status },
      );
    }

    await Enrollment.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Instructor enrollment delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete enrollment" },
      { status: 500 },
    );
  }
}
