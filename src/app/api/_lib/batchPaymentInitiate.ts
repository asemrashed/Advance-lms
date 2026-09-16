import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import mongoose from "mongoose";
import Batch from "@/models/Batch";
import BatchEnrollment from "@/models/BatchEnrollment";
import Course from "@/models/Course";
import Payment from "@/models/Payment";
import { initiatePayment } from "@/lib/paymentGateway/sslcommerz";
import {
  resolveBatchAmountForPlan,
  coursePricingFromLean,
  canFreeEnrollBatchPlan,
} from "@/lib/courses/liveCoursePricing";
import {
  buildPaymentDiscountMeta,
  resolveBatchAmountForStudent,
} from "@/lib/courses/studentPricing";
import { normalizeBillingPlan, type BillingPlan } from "@/lib/subscription/plan";
import { paymentDueAtForPendingLive } from "@/app/api/_lib/runningCoursePayment";
import {
  PAYMENT_REUSE_WINDOW_MS,
  getCheckoutUrlFromGatewayResponse,
  isCheckoutUrlValidForEnvironment,
  isDuplicateKeyError,
  makeTransactionId,
} from "@/app/api/_lib/paymentShared";

function isBatchEnrollmentPaidAndActive(row: {
  paymentStatus?: string;
  status?: string;
  paymentAmount?: number;
}): boolean {
  return (
    row.paymentStatus === "paid" &&
    row.status === "active" &&
    Number(row.paymentAmount ?? 0) > 0
  );
}

function isBatchEnrollmentPendingPayment(row: {
  paymentStatus?: string;
  status?: string;
}): boolean {
  return (
    row.paymentStatus === "pending" &&
    (row.status === "pending" || row.status === "active")
  );
}

export async function initiateBatchPayment(
  batchId: mongoose.Types.ObjectId,
  userId: string,
  session: Session | null,
  billingPlanInput?: BillingPlan | string,
): Promise<NextResponse> {
  const billingPlan = normalizeBillingPlan(billingPlanInput);
  const batch = await Batch.findOne({
    _id: batchId,
    isActive: true,
  })
    .select("_id name monthlyFee maxStudents courseId")
    .lean();

  if (!batch) {
    return NextResponse.json(
      { success: false, error: "Batch not found or not active" },
      { status: 404 },
    );
  }

  const activeCount = await BatchEnrollment.countDocuments({
    batchId: batch._id,
    status: "active",
    paymentStatus: "paid",
  });

  if (activeCount >= batch.maxStudents) {
    return NextResponse.json(
      { success: false, error: "Batch is full" },
      { status: 409 },
    );
  }

  const existing = await BatchEnrollment.findOne({
    batchId: batch._id,
    studentId: userId,
  })
    .select("_id status paymentStatus accessExpiresAt paymentAmount paymentDueAt")
    .lean();

  const isRenewal = Boolean(
    existing && isBatchEnrollmentPaidAndActive(existing) && billingPlan === "monthly",
  );

  if (existing && isBatchEnrollmentPaidAndActive(existing) && !isRenewal) {
    return NextResponse.json(
      { success: false, error: "Already enrolled in this batch" },
      { status: 409 },
    );
  }

  const parentCourseDoc = batch.courseId
    ? await Course.findById(batch.courseId)
        .select("isPaid price salePrice monthlyPrice")
        .lean()
    : null;
  const parentCourse = parentCourseDoc
    ? coursePricingFromLean(parentCourseDoc)
    : null;

  const pricing = batch.courseId
    ? await resolveBatchAmountForStudent(
        batch,
        parentCourse,
        billingPlan,
        userId,
      )
    : {
        listAmount: resolveBatchAmountForPlan(batch, parentCourse, billingPlan),
        finalAmount: resolveBatchAmountForPlan(batch, parentCourse, billingPlan),
        discountApplied: false,
      };
  const fee = pricing.finalAmount;
  const discountMeta = buildPaymentDiscountMeta(pricing);

  if (fee <= 0) {
    if (
      !canFreeEnrollBatchPlan({
        fee,
        plan: billingPlan,
        hasLinkedCourse: Boolean(parentCourse),
      })
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

    const enrollment = await BatchEnrollment.findOneAndUpdate(
      { batchId: batch._id, studentId: userId },
      {
        $set: {
          status: "active",
          paymentStatus: "paid",
          paymentAmount: 0,
        },
        $unset: { paymentId: "" },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      success: true,
      data: {
        entityType: "batch",
        batchId: String(batch._id),
        batchEnrollmentId: String(enrollment._id),
        enrolled: true,
        requiresPayment: false,
      },
    });
  }

  if (existing && isBatchEnrollmentPendingPayment(existing)) {
    const recentPendingPayment = await Payment.findOne({
      user: userId,
      entityType: "batch",
      batchId: batch._id,
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
            entityType: "batch",
            checkout_url: checkoutUrl,
            transactionId: recentPendingPayment.transactionId,
          },
        });
      }
    }
  }

  const runAttempt = async (transactionId: string) => {
    const batchEnrollment = isRenewal
      ? await BatchEnrollment.findOneAndUpdate(
          { batchId: batch._id, studentId: userId },
          { $set: { paymentId: transactionId, billingPlan } },
          { new: true },
        )
      : await BatchEnrollment.findOneAndUpdate(
          { batchId: batch._id, studentId: userId },
          {
            $set: {
              status: "active",
              paymentStatus: "pending",
              paymentId: transactionId,
              paymentAmount: fee,
              billingPlan,
              paymentDueAt: paymentDueAtForPendingLive(
                (existing?.paymentDueAt as Date | undefined) ?? null,
              ),
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );

    const gatewayInit = await initiatePayment({
      amount: fee,
      tran_id: transactionId,
      cus_name: session?.user?.name || "Customer",
      cus_email: session?.user?.email || "customer@example.com",
      cus_phone: String(userId).slice(-11) || "01700000000",
      cus_add1: "N/A",
      cus_city: "Dhaka",
    });

    const safeGatewayResponse = {
      checkout_url: gatewayInit.checkout_url,
      gatewayOrderId: gatewayInit.gatewayOrderId,
      transactionId,
      amount: fee,
      batchId: String(batch._id),
      userId: String(userId),
      entityType: "batch",
    };

    const payment = await Payment.create({
      user: userId,
      entityType: "batch",
      batchId: batch._id,
      course: batch.courseId,
      batchEnrollment: batchEnrollment?._id,
      billingPlan,
      amount: fee,
      ...discountMeta,
      transactionId,
      gateway: "sslcommerz",
      gatewayOrderId: gatewayInit.gatewayOrderId,
      status: "pending",
      gatewayResponse: safeGatewayResponse,
    });

    return {
      checkoutUrl: gatewayInit.checkout_url,
      transactionId: payment.transactionId,
    };
  };

  let transactionId = makeTransactionId(userId);
  try {
    const result = await runAttempt(transactionId);
    return NextResponse.json({
      success: true,
      data: {
        entityType: "batch",
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
    return NextResponse.json({
      success: true,
      data: {
        entityType: "batch",
        checkout_url: retryResult.checkoutUrl,
        transactionId: retryResult.transactionId,
      },
    });
  }
}
