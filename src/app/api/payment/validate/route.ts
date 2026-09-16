import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import BatchEnrollment from "@/models/BatchEnrollment";
import {
  findCourseEnrollmentForPayment,
  ensureCourseEnrollmentForPayment,
  fulfillPaymentSuccess,
  markPaymentFailed,
} from "@/app/api/_lib/paymentFulfillment";
import { verifyGatewayPayment } from "@/app/api/_lib/paymentVerify";

type ValidateRequestBody = {
  transactionId?: string;
  tranId?: string;
  valId?: string;
  sessionLuKey?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValidateRequestBody;
    const transactionId =
      typeof body.transactionId === "string" && body.transactionId.trim()
        ? body.transactionId.trim()
        : typeof body.tranId === "string" && body.tranId.trim()
          ? body.tranId.trim()
          : "";

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "transactionId is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const payment = await Payment.findOne({ transactionId }).select(
      "_id user entityType course enrollment batchId batchEnrollment qbAccessRequest billingPlan status gatewayOrderId transactionId amount createdAt",
    );

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 },
      );
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Session is optional on SSLCommerz return (ngrok host may not share cookies).
    // When a session exists, it must match the payment owner.
    if (userId && String(payment.user) !== String(userId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    if (payment.entityType === "qb_access" && !userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (payment.entityType === "qb_access") {
      if (payment.status === "success") {
        return NextResponse.json({
          success: true,
          data: {
            status: "success",
            entityType: "qb_access",
            transactionId: payment.transactionId,
            amount: String(payment.amount),
            currency: "BDT",
          },
        });
      }

      const gatewayOrderId =
        typeof payment.gatewayOrderId === "string" && payment.gatewayOrderId.trim()
          ? payment.gatewayOrderId
          : payment.transactionId;

      const { verified, raw } = await verifyGatewayPayment({
        gatewayOrderId,
        transactionId: payment.transactionId,
        amount: Number(payment.amount),
        valId: body.valId,
      });

      if (verified) {
        await fulfillPaymentSuccess(payment, raw);
        return NextResponse.json({
          success: true,
          data: {
            status: "success",
            entityType: "qb_access",
            transactionId: payment.transactionId,
            amount: String(payment.amount),
            currency: "BDT",
          },
        });
      }

      await markPaymentFailed(payment._id, raw);
      return NextResponse.json({
        success: false,
        error: "Payment validation failed",
      });
    }

    const entityType = payment.entityType === "batch" ? "batch" : "course";

    if (entityType === "batch") {
      const batch = await Batch.findOne({
        _id: payment.batchId,
        isActive: true,
      })
        .select("_id")
        .lean();

      if (!batch) {
        return NextResponse.json(
          { success: false, error: "Batch no longer available" },
          { status: 400 },
        );
      }
    } else {
      const course = await Course.findOne({
        _id: payment.course,
        status: "published",
        isHidden: { $ne: true },
      })
        .select("_id")
        .lean();

      if (!course) {
        return NextResponse.json(
          { success: false, error: "Course no longer available" },
          { status: 400 },
        );
      }
    }

    if (payment.status === "success") {
      if (entityType === "batch") {
        const enrollment = await BatchEnrollment.findById(payment.batchEnrollment)
          .select("_id status paymentStatus")
          .lean();
        return NextResponse.json({
          success: true,
          data: {
            status: "success",
            entityType: "batch",
            transactionId: payment.transactionId,
            amount: String(payment.amount),
            currency: "BDT",
            paymentDate: new Date(payment.createdAt).toISOString(),
            batchEnrollment: enrollment
              ? {
                  id: String(enrollment._id),
                  status: enrollment.status,
                  paymentStatus: enrollment.paymentStatus,
                }
              : undefined,
            batchId: String(payment.batchId),
          },
        });
      }

      let courseEnrollment = await findCourseEnrollmentForPayment({
        enrollment: payment.enrollment,
        transactionId: payment.transactionId,
        user: payment.user,
        course: payment.course,
      });
      if (!courseEnrollment) {
        await ensureCourseEnrollmentForPayment(payment);
        courseEnrollment = await findCourseEnrollmentForPayment({
          enrollment: payment.enrollment,
          transactionId: payment.transactionId,
          user: payment.user,
          course: payment.course,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          status: "success",
          entityType: "course",
          transactionId: payment.transactionId,
          amount: String(payment.amount),
          currency: "BDT",
          paymentDate: new Date(payment.createdAt).toISOString(),
          enrollment: (() => {
            const enrollment = {
              id: String(courseEnrollment?._id ?? payment.enrollment ?? ""),
              status: String(courseEnrollment?.status ?? "enrolled"),
              paymentStatus: String(courseEnrollment?.paymentStatus ?? "paid"),
            };
            return enrollment;
          })(),
          courseId: String(payment.course),
          batchId: payment.batchId ? String(payment.batchId) : undefined,
          batchEnrollment: payment.batchEnrollment
            ? await BatchEnrollment.findById(payment.batchEnrollment)
                .select("_id status paymentStatus")
                .lean()
            : undefined,
        },
      });
    }

    const gatewayOrderId =
      typeof payment.gatewayOrderId === "string" && payment.gatewayOrderId.trim()
        ? payment.gatewayOrderId
        : payment.transactionId;

    const { verified, raw } = await verifyGatewayPayment({
      gatewayOrderId,
      transactionId: payment.transactionId,
      amount: Number(payment.amount),
      valId: body.valId,
    });

    if (verified) {
      await fulfillPaymentSuccess(payment, raw);
      const courseEnrollment =
        entityType === "course"
          ? await findCourseEnrollmentForPayment({
              enrollment: payment.enrollment,
              transactionId: payment.transactionId,
              user: payment.user,
              course: payment.course,
            })
          : null;

      if (entityType === "batch") {
        const enrollment = await BatchEnrollment.findById(payment.batchEnrollment)
          .select("_id status paymentStatus")
          .lean();

        return NextResponse.json({
          success: true,
          data: {
            status: "success",
            entityType: "batch",
            transactionId: payment.transactionId,
            amount: String(payment.amount),
            currency: "BDT",
            paymentDate: new Date(payment.createdAt).toISOString(),
            batchEnrollment: {
              id: String(enrollment?._id ?? payment.batchEnrollment),
              status: enrollment?.status ?? "active",
              paymentStatus: enrollment?.paymentStatus ?? "paid",
            },
            batchId: String(payment.batchId),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          status: "success",
          entityType: "course",
          transactionId: payment.transactionId,
          amount: String(payment.amount),
          currency: "BDT",
          paymentDate: new Date(payment.createdAt).toISOString(),
          enrollment: {
            id: String(courseEnrollment?._id ?? payment.enrollment ?? ""),
            status: String(courseEnrollment?.status ?? "enrolled"),
            paymentStatus: String(courseEnrollment?.paymentStatus ?? "paid"),
          },
          courseId: String(payment.course),
          batchId: payment.batchId ? String(payment.batchId) : undefined,
          batchEnrollment: payment.batchEnrollment
            ? await BatchEnrollment.findById(payment.batchEnrollment)
                .select("_id status paymentStatus")
                .lean()
            : undefined,
        },
      });
    }

    await markPaymentFailed(payment._id, raw);

    return NextResponse.json({
      success: false,
      error: "Payment validation failed",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to validate payment" },
      { status: 500 },
    );
  }
}
