import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Payment from "@/models/Payment";
import Batch from "@/models/Batch";
import { countPaidBatchPlacements } from "@/app/api/_lib/liveEnrollment";
import { initiatePayment } from "@/lib/paymentGateway/sslcommerz";
import { initiateBatchPayment } from "@/app/api/_lib/batchPaymentInitiate";
import { resolveCourseAmountForPlan } from "@/lib/courses/liveCoursePricing";
import {
  loadActiveApprovedPricingMap,
  resolveAmountForStudent,
} from "@/lib/courses/studentPricing";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import { normalizeBillingPlan } from "@/lib/subscription/plan";
import { paymentDueAtForPendingLive } from "@/app/api/_lib/runningCoursePayment";
import {
  PAYMENT_REUSE_WINDOW_MS,
  asObjectId,
  getCheckoutUrlFromGatewayResponse,
  isCheckoutUrlValidForEnvironment,
  isDuplicateKeyError,
  makeTransactionId,
} from "@/app/api/_lib/paymentShared";

type InitiateRequestBody = {
  courseId?: string;
  courseIds?: string[];
  batchId?: string;
  selectedBatchId?: string;
  billingPlan?: "monthly" | "full";
};

function isEnrollmentPaidAndActive(row: {
  paymentStatus?: string;
  status?: string;
}): boolean {
  if (row.paymentStatus !== "paid") return false;
  return ["enrolled", "in_progress", "completed"].includes(String(row.status || ""));
}

function isEnrollmentPendingSuspended(row: {
  paymentStatus?: string;
  status?: string;
}): boolean {
  return row.paymentStatus === "pending" && row.status === "suspended";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    console.log("SESSION:", session);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as InitiateRequestBody;
    const billingPlan = normalizeBillingPlan(body.billingPlan);
    const batchObjectId = asObjectId(body.batchId);
    const selectedBatchObjectId = asObjectId(body.selectedBatchId);
    const rawCourseIds = [
      ...(typeof body.courseId === "string" ? [body.courseId] : []),
      ...(Array.isArray(body.courseIds) ? body.courseIds : []),
    ];
    const uniqueCourseIds = Array.from(new Set(rawCourseIds));
    const courseObjectIds = uniqueCourseIds
      .map((id) => asObjectId(id))
      .filter((id): id is mongoose.Types.ObjectId => id !== null);

    const hasBatch = Boolean(batchObjectId);
    const hasCourse = uniqueCourseIds.length > 0;

    if (hasBatch && hasCourse) {
      return NextResponse.json(
        { success: false, error: "Provide either batchId or courseId(s), not both" },
        { status: 400 },
      );
    }

    if (!hasBatch && !hasCourse) {
      return NextResponse.json(
        { success: false, error: "batchId or courseId(s) is required" },
        { status: 400 },
      );
    }

    await connectDB();

    if (hasBatch && batchObjectId) {
      return initiateBatchPayment(batchObjectId, userId, session, billingPlan);
    }

    if (courseObjectIds.length !== uniqueCourseIds.length) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing courseId(s)" },
        { status: 400 },
      );
    }
    // console.log("CONNECTED TO DATABASE");
    const courses = await Course.find({
      _id: { $in: courseObjectIds },
      status: "published",
      isHidden: { $ne: true },
    })
      .select("_id isPaid price salePrice monthlyPrice finalPrice courseType")
      .lean();

    if (courses.length !== courseObjectIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more courses not found or not published" },
        { status: 404 },
      );
    }

    const liveCourses = courses.filter(
      (course) => normalizeCourseType(course.courseType) === "live",
    );
    if (liveCourses.length > 1 || (liveCourses.length === 1 && courseObjectIds.length !== 1)) {
      return NextResponse.json(
        { success: false, error: "Live checkout supports one course at a time" },
        { status: 400 },
      );
    }
    const liveCourse = liveCourses[0];

    let selectedBatch:
      | { _id: mongoose.Types.ObjectId; courseId?: mongoose.Types.ObjectId; maxStudents?: number }
      | null = null;
    if (liveCourse) {
      if (!selectedBatchObjectId) {
        return NextResponse.json(
          { success: false, error: "selectedBatchId is required for live course checkout" },
          { status: 400 },
        );
      }
      selectedBatch = await Batch.findOne({
        _id: selectedBatchObjectId,
        courseId: liveCourse._id,
        isActive: true,
      })
        .select("_id courseId maxStudents")
        .lean();
      if (!selectedBatch) {
        return NextResponse.json(
          { success: false, error: "Selected batch not found for this live course" },
          { status: 404 },
        );
      }
      const maxStudents = Number(selectedBatch.maxStudents) || 0;
      if (maxStudents > 0) {
        const activeCount = await countPaidBatchPlacements(
          selectedBatch._id,
          userId,
        );
        if (activeCount >= maxStudents) {
          return NextResponse.json(
            { success: false, error: "This section is full" },
            { status: 409 },
          );
        }
      }
    }

    const pricingMap = await loadActiveApprovedPricingMap(userId);

    const normalizedCourses = await Promise.all(
      courses.map(async (course) => {
        const pricingInput = {
          isPaid: course.isPaid,
          price: course.price,
          salePrice: course.salePrice,
          monthlyPrice: course.monthlyPrice,
        };
        const pricing = await resolveAmountForStudent(
          course._id,
          pricingInput,
          billingPlan,
          userId,
          pricingMap,
        );
        return {
          id: String(course._id),
          objectId: course._id,
          isPaid: course.isPaid,
          amount: pricing.finalAmount,
          listAmount: pricing.listAmount,
          discountApplied: pricing.discountApplied,
          approvedPricingId: pricing.approvedPricingId,
        };
      }),
    );

    const invalidPaidCourse = normalizedCourses.find(
      (course) => !course.isPaid || !Number.isFinite(course.amount) || course.amount <= 0,
    );

    if (invalidPaidCourse) {
      return NextResponse.json(
        { success: false, error: "All selected courses must be paid courses" },
        { status: 400 },
      );
    }

    const totalAmount = normalizedCourses.reduce((sum, course) => sum + course.amount, 0);
    const totalListAmount = normalizedCourses.reduce(
      (sum, course) => sum + course.listAmount,
      0,
    );
    const anyDiscount = normalizedCourses.some((course) => course.discountApplied);
    const primaryDiscountMeta = normalizedCourses.find((c) => c.discountApplied);

    const existingEnrollments = await Enrollment.find({
      student: userId,
      course: { $in: courseObjectIds },
    })
      .select("_id course paymentStatus status paymentDueAt")
      .lean();

    const hasAlreadyEnrolled = existingEnrollments.some((enrollment) =>
      isEnrollmentPaidAndActive(enrollment),
    );

    // Monthly plan allows re-payment (renewal) on an already-active enrollment.
    if (hasAlreadyEnrolled && billingPlan !== "monthly") {
      return NextResponse.json(
        { success: false, error: "One or more selected courses are already enrolled" },
        { status: 409 },
      );
    }

    const isSingleCourseCheckout = courseObjectIds.length === 1;
    const existingEnrollment = isSingleCourseCheckout
      ? existingEnrollments.find(
          (enrollment) => String(enrollment.course) === String(courseObjectIds[0]),
        )
      : null;

    if (isSingleCourseCheckout && existingEnrollment && isEnrollmentPendingSuspended(existingEnrollment)) {
      const recentPendingPayment = await Payment.findOne({
        user: userId,
        $or: [{ entityType: "course" }, { entityType: { $exists: false } }],
        course: courseObjectIds[0],
        ...(selectedBatch ? { batchId: selectedBatch._id } : {}),
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .select("transactionId gatewayResponse createdAt")
        .lean();

      if (recentPendingPayment) {
        const ageMs =
          Date.now() - new Date(recentPendingPayment.createdAt).getTime();
        const checkoutUrl = getCheckoutUrlFromGatewayResponse(
          recentPendingPayment.gatewayResponse,
        );

        if (
          ageMs < PAYMENT_REUSE_WINDOW_MS &&
          checkoutUrl &&
          isCheckoutUrlValidForEnvironment(checkoutUrl)
        ) {
          return NextResponse.json({
            success: true,
            data: {
              checkout_url: checkoutUrl,
              transactionId: recentPendingPayment.transactionId,
            },
          });
        }
      }
    }

    const runAttempt = async (transactionId: string) => {
      const upsertedEnrollments = await Promise.all(
        normalizedCourses.map((course) => {
          const existing = existingEnrollments.find(
            (row) => String(row.course) === course.id,
          );
          // Renewal: keep active access, just tag the pending renewal payment.
          if (existing && isEnrollmentPaidAndActive(existing)) {
            return Enrollment.findByIdAndUpdate(
              existing._id,
              {
                $set: {
                  paymentId: transactionId,
                  billingPlan,
                  selectedBatchId: liveCourse ? selectedBatch?._id : undefined,
                },
              },
              { new: true },
            );
          }
          const existingDue = existing?.paymentDueAt as Date | undefined;
          return Enrollment.findOneAndUpdate(
            {
              student: userId,
              course: course.objectId,
            },
            {
              $set: {
                status: liveCourse ? "enrolled" : "suspended",
                paymentStatus: "pending",
                paymentId: transactionId,
                paymentAmount: course.amount,
                paymentMethod: "online",
                billingPlan,
                selectedBatchId: liveCourse ? selectedBatch?._id : undefined,
                ...(liveCourse
                  ? { paymentDueAt: paymentDueAtForPendingLive(existingDue) }
                  : {}),
              },
            },
            {
              new: true,
              upsert: true,
              setDefaultsOnInsert: true,
            },
          );
        }),
      );

      const primaryEnrollment = upsertedEnrollments.find(Boolean);
      if (!primaryEnrollment) {
        throw new Error("Failed to prepare enrollment for payment");
      }

      const gatewayInit = await initiatePayment({
        amount: totalAmount,
        tran_id: transactionId,
        cus_name: session?.user?.name || "Customer",
        cus_email: session?.user?.email || "customer@example.com",
        cus_phone: String(userId).slice(-11) || "01700000000",
        cus_add1: "N/A",
        cus_city: "Dhaka",
      });
      // console.log("GATEWAY INIT:", gatewayInit);
      const safeGatewayResponse = {
        checkout_url: gatewayInit.checkout_url,
        gatewayOrderId: gatewayInit.gatewayOrderId,
        transactionId,
        amount: totalAmount,
        courseIds: normalizedCourses.map((course) => course.id),
        selectedBatchId: selectedBatch ? String(selectedBatch._id) : undefined,
        userId: String(userId),
      };
      console.log("SAFE GATEWAY RESPONSE:", safeGatewayResponse);
      const payment = await Payment.create({
        user: userId,
        entityType: "course",
        course: courseObjectIds[0],
        enrollment: primaryEnrollment._id,
        batchId: selectedBatch?._id,
        billingPlan,
        amount: totalAmount,
        ...(anyDiscount
          ? {
              originalAmount: totalListAmount,
              discountApplied: true,
              approvedPricingId: primaryDiscountMeta?.approvedPricingId
                ? new mongoose.Types.ObjectId(primaryDiscountMeta.approvedPricingId)
                : undefined,
            }
          : { discountApplied: false }),
        transactionId,
        gateway: "sslcommerz",
        gatewayOrderId: gatewayInit.gatewayOrderId,
        status: "pending",
        gatewayResponse: safeGatewayResponse,
      });
      console.log("PAYMENT:", payment);
      return {
        checkoutUrl: gatewayInit.checkout_url,
        transactionId: payment.transactionId,
      };
    };

    let transactionId = makeTransactionId(userId);
    try {
      const result = await runAttempt(transactionId);
      console.log("RESULT:", result);
      return NextResponse.json({
        success: true,
        data: {
          entityType: "course",
          checkout_url: result.checkoutUrl,
          transactionId: result.transactionId,
        },
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      transactionId = makeTransactionId(userId, true);
      const retryResult = await runAttempt(transactionId);
      console.log("RETRY RESULT:", retryResult);
      return NextResponse.json({
        success: true,
        data: {
          entityType: "course",
          checkout_url: retryResult.checkoutUrl,
          transactionId: retryResult.transactionId,
        },
      });
    }
  } catch (error) {
    console.log("ERROR:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to initiate payment";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
