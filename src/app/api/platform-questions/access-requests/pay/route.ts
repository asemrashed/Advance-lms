import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import QBAccessRequest from "@/models/QBAccessRequest";
import Payment from "@/models/Payment";
import {
  resolveQbAccessPrice,
  instructorHasFullAdminQBAccess,
} from "@/app/api/_lib/platformQuestionAccess";
import { isPlatformQbPaidAccessEnabled } from "@/lib/platformQbAccess";
import { initiatePayment } from "@/lib/paymentGateway/sslcommerz";
import { makeTransactionId } from "@/app/api/_lib/paymentShared";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";

/**
 * POST /api/platform-questions/access-requests/pay
 * Body (optional): { accessRequestId } OR scoped fields to create a paid pending request.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Instructor authentication required" },
        { status: 401 },
      );
    }

    if (!isPlatformQbPaidAccessEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "Paid QB access is not enabled. Request free access instead.",
        },
        { status: 400 },
      );
    }

    await connectDB();
    const userId = session.user.id;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (await instructorHasFullAdminQBAccess(userId)) {
      return NextResponse.json(
        { success: false, error: "You already have full platform question bank access" },
        { status: 409 },
      );
    }

    let requestDoc = null;
    const accessRequestId = String(body.accessRequestId || "").trim();

    if (accessRequestId && isObjectId(accessRequestId)) {
      requestDoc = await QBAccessRequest.findOne({
        _id: toObjectId(accessRequestId),
        requesterId: toObjectId(userId),
        status: "pending",
      });
      if (!requestDoc) {
        return NextResponse.json(
          { success: false, error: "Access request not found" },
          { status: 404 },
        );
      }
    } else {
      const { createAccessRequest } = await import("@/app/api/_lib/platformQuestionAccess");
      const created = await createAccessRequest(
        { id: userId, role: "instructor" },
        { ...body, isPaid: true },
      );
      if ("error" in created) {
        return NextResponse.json(
          { success: false, error: created.error },
          { status: created.status },
        );
      }
      requestDoc = await QBAccessRequest.findById(created.doc._id);
      if (!requestDoc) {
        return NextResponse.json(
          { success: false, error: "Failed to create access request" },
          { status: 500 },
        );
      }
    }

    const amount =
      requestDoc.amount != null && Number(requestDoc.amount) > 0
        ? Number(requestDoc.amount)
        : await resolveQbAccessPrice({
            subjectId: requestDoc.subjectId ? String(requestDoc.subjectId) : undefined,
            subjectCode: requestDoc.subjectCode || undefined,
            scopeType: requestDoc.scopeType || "full",
          });

    requestDoc.isPaid = true;
    requestDoc.amount = amount;
    await requestDoc.save();

    const transactionId = makeTransactionId(userId);
    const productName =
      requestDoc.scopeType === "full"
        ? "Platform QB — Full Access"
        : `Platform QB — ${requestDoc.subjectName || requestDoc.subjectCode || "Subject"}`;

    const gatewayInit = await initiatePayment({
      amount,
      tran_id: transactionId,
      cus_name: session.user.name || "Instructor",
      cus_email: session.user.email || "customer@example.com",
      cus_phone: String(userId).slice(-11) || "01700000000",
      cus_add1: "N/A",
      cus_city: "Dhaka",
    });

    await Payment.create({
      user: toObjectId(userId),
      entityType: "qb_access",
      qbAccessRequest: requestDoc._id,
      amount,
      transactionId,
      gateway: "sslcommerz",
      gatewayOrderId: gatewayInit.gatewayOrderId,
      status: "pending",
      gatewayResponse: {
        checkout_url: gatewayInit.checkout_url,
        gatewayOrderId: gatewayInit.gatewayOrderId,
        entityType: "qb_access",
        scopeType: requestDoc.scopeType,
        productName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        checkout_url: gatewayInit.checkout_url,
        transactionId,
        amount,
        accessRequestId: String(requestDoc._id),
        gateway: "sslcommerz",
        productName,
      },
    });
  } catch (error) {
    console.error("QB access pay error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate QB access payment" },
      { status: 500 },
    );
  }
}
