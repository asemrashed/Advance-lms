import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import EnrollmentRequest from "@/models/EnrollmentRequest";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import { countPaidBatchPlacements } from "@/app/api/_lib/liveEnrollment";
import {
  instructorRequestScope,
  mapEnrollmentRequest,
} from "@/app/api/_lib/enrollmentRequests";
import {
  coursePricingFromLean,
  canFreeEnrollBatchPlan,
} from "@/lib/courses/liveCoursePricing";
import {
  resolveAmountForStudent,
  resolveBatchAmountForStudent,
} from "@/lib/courses/studentPricing";
import { normalizeBillingPlan } from "@/lib/subscription/plan";
import {
  ensurePendingLiveBatchEnrollment,
  ensurePendingLiveCourseEnrollment,
  isLiveCourseId,
} from "@/app/api/_lib/runningCoursePayment";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const statusParam = request.nextUrl.searchParams.get("status")?.trim();
    const query: Record<string, unknown> = {};
    if (statusParam && statusParam !== "all") query.status = statusParam;

    if (auth.user.role === "student") {
      query.studentId = auth.user.id;
    } else if (auth.user.role === "instructor") {
      Object.assign(query, await instructorRequestScope(auth.user.id));
    }

    const rows = await EnrollmentRequest.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: "studentId", select: "name email" })
      .populate({ path: "courseId", select: "title" })
      .populate({ path: "batchId", select: "name" })
      .lean();

    return NextResponse.json({
      success: true,
      data: rows.map((r) => mapEnrollmentRequest(r as Record<string, unknown>)),
    });
  } catch (error) {
    console.error("GET /api/enrollment-requests", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch enrollment requests" },
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
    const entityType = body.entityType === "batch" ? "batch" : "course";
    const billingPlan = normalizeBillingPlan(body.billingPlan);
    const proofUrls = Array.isArray(body.proofUrls)
      ? body.proofUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      : [];
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (proofUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one proof document is required" },
        { status: 400 },
      );
    }

    const courseId = typeof body.courseId === "string" ? body.courseId : "";
    const batchId = typeof body.batchId === "string" ? body.batchId : "";

    let amount = 0;
    const requestDoc: Record<string, unknown> = {
      studentId: auth.user.id,
      entityType,
      billingPlan,
      proofUrls,
      note,
      status: "pending",
    };

    if (entityType === "batch") {
      if (!mongoose.Types.ObjectId.isValid(batchId)) {
        return NextResponse.json(
          { success: false, error: "Valid batchId is required" },
          { status: 400 },
        );
      }
      const batch = await Batch.findOne({ _id: batchId, isActive: true })
        .select("_id monthlyFee courseId")
        .lean();
      if (!batch) {
        return NextResponse.json(
          { success: false, error: "Batch not found" },
          { status: 404 },
        );
      }
      const parentCourseDoc = batch.courseId
        ? await Course.findById(batch.courseId)
            .select("isPaid price salePrice monthlyPrice")
            .lean()
        : null;
      amount = (
        await resolveBatchAmountForStudent(
          batch,
          parentCourseDoc ? coursePricingFromLean(parentCourseDoc) : null,
          billingPlan,
          auth.user.id,
        )
      ).finalAmount;
      if (
        !canFreeEnrollBatchPlan({
          fee: amount,
          plan: billingPlan,
          hasLinkedCourse: Boolean(parentCourseDoc),
        }) &&
        amount <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This batch has no linked course pricing. Link a course before full-plan enrollment.",
          },
          { status: 400 },
        );
      }
      requestDoc.batchId = batch._id;
    } else {
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
      amount = (
        await resolveAmountForStudent(
          course._id,
          {
            isPaid: course.isPaid,
            price: course.price,
            salePrice: course.salePrice,
            monthlyPrice: (course as { monthlyPrice?: number }).monthlyPrice,
          },
          billingPlan,
          auth.user.id,
        )
      ).finalAmount;
      requestDoc.courseId = course._id;

      if (batchId) {
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
          return NextResponse.json(
            { success: false, error: "Valid batchId is required" },
            { status: 400 },
          );
        }
        const batch = await Batch.findOne({
          _id: batchId,
          courseId: course._id,
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
          const activeCount = await countPaidBatchPlacements(
            batch._id,
            auth.user.id,
          );
          if (activeCount >= maxStudents) {
            return NextResponse.json(
              { success: false, error: "This section is full" },
              { status: 409 },
            );
          }
        }
        requestDoc.batchId = batch._id;
      }
    }

    requestDoc.amount = amount;

    // Prevent duplicate pending requests for the same target.
    const dupFilter: Record<string, unknown> = {
      studentId: auth.user.id,
      status: "pending",
      entityType,
    };
    if (entityType === "batch") dupFilter.batchId = requestDoc.batchId;
    else dupFilter.courseId = requestDoc.courseId;

    const existing = await EnrollmentRequest.findOne(dupFilter).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "You already have a pending request for this." },
        { status: 409 },
      );
    }

    const created = await EnrollmentRequest.create(requestDoc);

    if (entityType === "course" && requestDoc.courseId) {
      const live = await isLiveCourseId(requestDoc.courseId);
      if (live) {
        await ensurePendingLiveCourseEnrollment({
          studentId: auth.user.id,
          courseId: String(requestDoc.courseId),
          batchId: requestDoc.batchId ? String(requestDoc.batchId) : undefined,
          billingPlan,
          paymentAmount: amount,
          paymentMethod: "cash",
        });
      }
    } else if (entityType === "batch" && requestDoc.batchId) {
      await ensurePendingLiveBatchEnrollment({
        studentId: auth.user.id,
        batchId: String(requestDoc.batchId),
        billingPlan,
        paymentAmount: amount,
      });
    }

    return NextResponse.json({
      success: true,
      data: { _id: String(created._id), status: "pending", amount },
    });
  } catch (error) {
    console.error("POST /api/enrollment-requests", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit enrollment request" },
      { status: 500 },
    );
  }
}
