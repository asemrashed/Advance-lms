import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import QBAccessRequest from "@/models/QBAccessRequest";
import User from "@/models/User";
import { generateInvoicePdfBuffer } from "@/lib/invoice";
import { entityTypeLabel } from "@/lib/invoice";
import { getInstructorScopeIds } from "@/app/api/_lib/paymentQueries";
import { getDisplayName } from "@/lib/displayName";
import { isAdminAreaRole } from "@/lib/roles";

async function canAccessPayment(
  payment: { user: unknown; entityType: string; course?: unknown; batchId?: unknown },
  userId: string,
  role: string,
): Promise<boolean> {
  if (String(payment.user) === String(userId)) return true;
  if (isAdminAreaRole(role)) return true;

  if (role === "instructor") {
    const { courseIds, batchIds } = await getInstructorScopeIds(userId);
    const courseIdSet = new Set(courseIds.map(String));
    const batchIdSet = new Set(batchIds.map(String));
    if (payment.course && courseIdSet.has(String(payment.course))) return true;
    if (payment.batchId && batchIdSet.has(String(payment.batchId))) return true;
  }

  return false;
}

export async function GET(
  request: NextRequest,
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
        "_id user entityType course batchId qbAccessRequest amount status transactionId createdAt updatedAt",
      )
      .lean();

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 },
      );
    }

    const role = session.user?.role || "";
    const allowed = await canAccessPayment(payment, userId, role);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (payment.status !== "success") {
      return NextResponse.json(
        { success: false, error: "Invoice is only available for successful payments" },
        { status: 400 },
      );
    }

    const payer = await User.findById(payment.user)
      .select("name phone")
      .lean();

    const payerName =
      getDisplayName(payer) ||
      payer?.name ||
      "Customer";

    let itemTitle = "Purchase";
    const entityType = payment.entityType || "course";

    if (entityType === "qb_access" && payment.qbAccessRequest) {
      const qb = await QBAccessRequest.findById(payment.qbAccessRequest)
        .select("subjectName")
        .lean();
      itemTitle = qb?.subjectName
        ? `Platform Question Bank — ${qb.subjectName}`
        : "Platform Question Bank Access";
    } else if (entityType === "batch" && payment.batchId) {
      const batch = await Batch.findById(payment.batchId).select("name subject").lean();
      itemTitle = batch?.name
        ? String(batch.name)
        : batch?.subject
          ? String(batch.subject)
          : "Batch enrollment";
    } else if (payment.course) {
      const course = await Course.findById(payment.course).select("title").lean();
      itemTitle = course?.title ? String(course.title) : "Course enrollment";
    }

    const paidAt = payment.updatedAt || payment.createdAt;
    const pdfBuffer = await generateInvoicePdfBuffer({
      transactionId: payment.transactionId,
      payerName,
      payerPhone: payer?.phone ? String(payer.phone) : undefined,
      itemTitle,
      entityType,
      entityLabel: entityTypeLabel(entityType),
      amount: Number(payment.amount) || 0,
      paidAt,
    });

    const safeName = payment.transactionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const inline = request.nextUrl.searchParams.get("inline") === "1";
    const disposition = inline ? "inline" : "attachment";
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="invoice-${safeName}.pdf"`,
      },
    });
  } catch (error) {
    console.error("GET payment invoice error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate invoice PDF" },
      { status: 500 },
    );
  }
}
