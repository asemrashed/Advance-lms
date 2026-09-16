import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import DiscountRequest from "@/models/DiscountRequest";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import { countPaidBatchPlacements } from "@/app/api/_lib/liveEnrollment";
import {
  instructorDiscountRequestScope,
  mapDiscountRequest,
} from "@/app/api/_lib/discountRequests";
import {
  coursePricingFromLean,
  resolveCourseAmountForPlan,
} from "@/lib/courses/liveCoursePricing";
import { normalizeBillingPlan } from "@/lib/subscription/plan";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const statusParam = request.nextUrl.searchParams.get("status")?.trim();
    const courseIdParam = request.nextUrl.searchParams.get("courseId")?.trim();
    const query: Record<string, unknown> = {};
    if (statusParam && statusParam !== "all") query.status = statusParam;
    if (courseIdParam && mongoose.Types.ObjectId.isValid(courseIdParam)) {
      query.courseId = courseIdParam;
    }

    if (auth.user.role === "student") {
      query.studentId = auth.user.id;
    } else if (auth.user.role === "instructor") {
      Object.assign(query, await instructorDiscountRequestScope(auth.user.id));
    }

    const rows = await DiscountRequest.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: "studentId", select: "name email" })
      .populate({ path: "courseId", select: "title" })
      .populate({ path: "selectedBatchId", select: "name" })
      .lean();

    return NextResponse.json({
      success: true,
      data: rows.map((r) => mapDiscountRequest(r as Record<string, unknown>)),
    });
  } catch (error) {
    console.error("GET /api/discount-requests", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch discount requests" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    const billingPlan = normalizeBillingPlan(body.billingPlan);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const batchId = typeof body.selectedBatchId === "string"
      ? body.selectedBatchId.trim()
      : typeof body.batchId === "string"
        ? body.batchId.trim()
        : "";

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Valid courseId is required" },
        { status: 400 },
      );
    }

    const course = await Course.findOne({
      _id: courseId,
      status: "published",
      isHidden: { $ne: true },
    })
      .select("isPaid price salePrice monthlyPrice")
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    const pricing = coursePricingFromLean(course);
    const listPrice = resolveCourseAmountForPlan(pricing, billingPlan);

    if (listPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "This course plan is free — no discount needed" },
        { status: 400 },
      );
    }

    const existingPending = await DiscountRequest.findOne({
      studentId: auth.user.id,
      courseId,
      billingPlan,
      status: "pending",
    })
      .select("_id")
      .lean();

    if (existingPending) {
      return NextResponse.json(
        { success: false, error: "You already have a pending discount request for this plan." },
        { status: 409 },
      );
    }

    const doc: Record<string, unknown> = {
      studentId: auth.user.id,
      courseId,
      billingPlan,
      listPrice,
      message: message || undefined,
      status: "pending",
    };

    if (batchId) {
      if (!mongoose.Types.ObjectId.isValid(batchId)) {
        return NextResponse.json(
          { success: false, error: "Valid batchId is required" },
          { status: 400 },
        );
      }
      const batch = await Batch.findOne({
        _id: batchId,
        courseId,
        isActive: true,
      })
        .select("_id maxStudents")
        .lean();
      if (!batch) {
        return NextResponse.json(
          { success: false, error: "Selected batch not found for this course" },
          { status: 404 },
        );
      }
      const maxStudents = Number(batch.maxStudents) || 0;
      if (maxStudents > 0) {
        const activeCount = await countPaidBatchPlacements(batch._id, auth.user.id);
        if (activeCount >= maxStudents) {
          return NextResponse.json(
            { success: false, error: "This section is full" },
            { status: 409 },
          );
        }
      }
      doc.selectedBatchId = batch._id;
    }

    const created = await DiscountRequest.create(doc);
    return NextResponse.json({
      success: true,
      data: {
        _id: String(created._id),
        status: "pending",
        listPrice,
      },
    });
  } catch (error) {
    console.error("POST /api/discount-requests", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit discount request" },
      { status: 500 },
    );
  }
}
