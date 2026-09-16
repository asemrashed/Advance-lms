import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";
import {
  mapEnrollmentRow,
  requireDeleteEnrollmentJson,
  requireManageEnrollmentsJson,
} from "../_lib";
import { upsertApprovedStudentPricing } from "@/lib/courses/studentPricing";
import {
  coursePricingFromLean,
  resolveCourseAmountForPlan,
} from "@/lib/courses/liveCoursePricing";
import { normalizeBillingPlan } from "@/lib/subscription/plan";

type RouteContext = { params: Promise<{ id: string }> };

function parseDueAt(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireManageEnrollmentsJson();
    if ("error" in auth && auth.error) return auth.error;
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid enrollment ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const existing = await Enrollment.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Enrollment not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    if (typeof body.status === "string") update.status = body.status;
    if (typeof body.progress === "number") update.progress = body.progress;
    if (typeof body.paymentStatus === "string") {
      update.paymentStatus = body.paymentStatus;
    }
    if (typeof body.paymentAmount === "number") {
      update.paymentAmount = Math.max(0, body.paymentAmount);
    }
    if (typeof body.paymentMethod === "string") {
      update.paymentMethod = body.paymentMethod;
    }
    if (typeof body.notes === "string") update.notes = body.notes;
    if (typeof body.billingPlan === "string") {
      update.billingPlan = normalizeBillingPlan(body.billingPlan);
    }

    const due = parseDueAt(body.paymentDueAt);
    if (due === null) {
      update.paymentDueAt = undefined;
    } else if (due) {
      update.paymentDueAt = due;
    }

    if (Object.keys(update).length === 0 && body.lockPrice !== true) {
      return NextResponse.json(
        { success: false, error: "No changes provided" },
        { status: 400 },
      );
    }

    if (due === null) {
      existing.set("paymentDueAt", undefined);
    }
    if (Object.keys(update).length) {
      existing.set(update);
    }
    await existing.save();

    const lockPrice = body.lockPrice === true || typeof body.paymentAmount === "number";
    if (lockPrice) {
      const courseDoc = await Course.findById(existing.course)
        .select("isPaid price salePrice monthlyPrice")
        .lean();
      if (courseDoc) {
        const plan = normalizeBillingPlan(
          (update.billingPlan as string | undefined) || existing.billingPlan,
        );
        const listAmount = resolveCourseAmountForPlan(
          coursePricingFromLean(courseDoc),
          plan,
        );
        const amount =
          typeof body.paymentAmount === "number"
            ? Math.max(0, body.paymentAmount)
            : Number(existing.paymentAmount) || listAmount;
        await upsertApprovedStudentPricing({
          studentId: String(existing.student),
          courseId: String(existing.course),
          billingPlan: plan,
          approvedAmount: amount,
          listPrice: listAmount,
          approvedBy: auth.userId,
          note: "Fixed price from admin enrollment update",
        });
      }
    }

    const updated = await Enrollment.findById(id)
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
    console.error("Admin enrollment update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update enrollment" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireDeleteEnrollmentJson();
    if ("error" in auth && auth.error) return auth.error;
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid enrollment ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const existing = await Enrollment.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Enrollment not found" },
        { status: 404 },
      );
    }

    await Enrollment.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin enrollment delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete enrollment" },
      { status: 500 },
    );
  }
}
