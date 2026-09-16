import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import BatchEnrollment from "@/models/BatchEnrollment";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ transactionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const { transactionId } = await context.params;
    const normalizedId =
      typeof transactionId === "string" ? transactionId.trim() : "";

    if (!normalizedId) {
      return NextResponse.json(
        { success: false, error: "transactionId is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const payment = await Payment.findOne({ transactionId: normalizedId })
      .select(
        "_id user entityType course enrollment batchId batchEnrollment amount status transactionId createdAt",
      )
      .lean();

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 },
      );
    }

    if (String(payment.user) !== String(userId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const entityType = payment.entityType === "batch" ? "batch" : "course";
    const isSuccess = payment.status === "success";

    if (entityType === "batch") {
      const batchEnrollment = payment.batchEnrollment
        ? await BatchEnrollment.findById(payment.batchEnrollment)
            .select("_id status paymentStatus")
            .lean()
        : null;

      return NextResponse.json({
        success: true,
        data: {
          id: String(payment._id),
          entityType: "batch",
          transactionId: payment.transactionId,
          amount: String(payment.amount),
          currency: "BDT",
          status: payment.status,
          initiatedAt: payment.createdAt,
          batchId: payment.batchId ? String(payment.batchId) : undefined,
          batchEnrollment: batchEnrollment
            ? {
                id: String(batchEnrollment._id),
                status: batchEnrollment.status,
                paymentStatus: batchEnrollment.paymentStatus,
              }
            : {
                id: payment.batchEnrollment
                  ? String(payment.batchEnrollment)
                  : undefined,
                status: isSuccess ? "active" : "pending",
                paymentStatus: isSuccess ? "paid" : "pending",
              },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(payment._id),
        entityType: "course",
        transactionId: payment.transactionId,
        amount: String(payment.amount),
        currency: "BDT",
        status: payment.status,
        initiatedAt: payment.createdAt,
        courseId: payment.course ? String(payment.course) : undefined,
        batchId: payment.batchId ? String(payment.batchId) : undefined,
        enrollment: {
          id: payment.enrollment ? String(payment.enrollment) : undefined,
          status: isSuccess ? "enrolled" : "suspended",
          paymentStatus: isSuccess ? "paid" : payment.status,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment" },
      { status: 500 },
    );
  }
}
