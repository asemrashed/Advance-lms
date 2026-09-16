import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { fulfillPaymentSuccess, markPaymentFailed } from "@/app/api/_lib/paymentFulfillment";
import { verifyGatewayPayment } from "@/app/api/_lib/paymentVerify";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const ipnPayload = Object.fromEntries(formData);
    const tranIdRaw = formData.get("tran_id");
    const tranId = typeof tranIdRaw === "string" ? tranIdRaw.trim() : "";
    const valIdRaw = formData.get("val_id");
    const valId = typeof valIdRaw === "string" ? valIdRaw.trim() : "";

    if (!tranId) {
      return NextResponse.json(
        { success: false, error: "tran_id is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const payment = await Payment.findOne({
      $or: [{ transactionId: tranId }, { gatewayOrderId: tranId }],
    }).select(
      "_id entityType course enrollment batchEnrollment qbAccessRequest billingPlan status gatewayOrderId transactionId amount user batchId",
    );

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 },
      );
    }

    if (payment.status === "success") {
      return NextResponse.json({ success: true, status: "already_processed" });
    }

    const { verified, raw } = await verifyGatewayPayment({
      gatewayOrderId: payment.gatewayOrderId,
      transactionId: payment.transactionId,
      amount: Number(payment.amount),
      valId: valId || undefined,
    });

    if (verified) {
      await fulfillPaymentSuccess(payment, {
        source: "ipn",
        ipnPayload,
        verification: raw,
      });

      return NextResponse.json({ success: true, status: "processed" });
    }

    await markPaymentFailed(payment._id, {
      source: "ipn",
      ipnPayload,
      verification: raw,
    });

    return NextResponse.json({
      success: false,
      status: "verification_failed",
    });
  } catch (error) {
    console.error("Error processing IPN:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process IPN" },
      { status: 500 },
    );
  }
}
