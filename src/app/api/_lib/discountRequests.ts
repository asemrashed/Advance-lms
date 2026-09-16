import mongoose from "mongoose";
import { type IDiscountRequest } from "@/models/DiscountRequest";
import ApprovedStudentPricing from "@/models/ApprovedStudentPricing";
import DiscountRequest from "@/models/DiscountRequest";
import { getInstructorScopeIds } from "@/app/api/_lib/paymentQueries";
import { getDisplayName } from "@/lib/displayName";

export async function canInstructorReviewDiscountRequest(
  request: Pick<IDiscountRequest, "courseId">,
  instructorId: string,
): Promise<boolean> {
  const { courseIds } = await getInstructorScopeIds(instructorId);
  if (!request.courseId) return false;
  return courseIds.map(String).includes(String(request.courseId));
}

export async function instructorDiscountRequestScope(
  instructorId: string,
): Promise<Record<string, unknown>> {
  const { courseIds } = await getInstructorScopeIds(instructorId);
  if (courseIds.length === 0) return { _id: { $in: [] } };
  return { courseId: { $in: courseIds } };
}

export async function approveDiscountRequest(
  request: IDiscountRequest,
  reviewerId: string,
  approvedAmount: number,
  note?: string,
): Promise<void> {
  const now = new Date();
  const amount = Math.max(0, Number(approvedAmount) || 0);

  await ApprovedStudentPricing.updateMany(
    {
      studentId: request.studentId,
      courseId: request.courseId,
      billingPlan: request.billingPlan,
      status: "active",
    },
    { $set: { status: "revoked", revokedAt: now } },
  );

  const pricing = await ApprovedStudentPricing.create({
    studentId: request.studentId,
    courseId: request.courseId,
    billingPlan: request.billingPlan,
    approvedAmount: amount,
    listPrice: request.listPrice,
    discountRequestId: request._id,
    approvedBy: new mongoose.Types.ObjectId(reviewerId),
    approvedAt: now,
    note: note?.trim() || undefined,
    status: "active",
  });

  request.status = "approved";
  request.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
  request.reviewedAt = now;
  request.approvedAmount = amount;
  request.approvedPricingId = pricing._id;
  await request.save();
}

export function mapDiscountRequest(row: Record<string, unknown>) {
  const student = row.studentId as Record<string, unknown> | undefined;
  const course = row.courseId as Record<string, unknown> | undefined;
  const batch = row.selectedBatchId as Record<string, unknown> | undefined;
  const studentName =
    student && typeof student === "object"
      ? getDisplayName(student) ||
        String(student.name || student.email || "Student")
      : "Student";

  return {
    _id: String(row._id),
    status: row.status,
    billingPlan: row.billingPlan,
    listPrice: Number(row.listPrice) || 0,
    requestedAmount:
      row.requestedAmount != null ? Number(row.requestedAmount) : undefined,
    approvedAmount:
      row.approvedAmount != null ? Number(row.approvedAmount) : undefined,
    message: row.message ? String(row.message) : "",
    rejectionNote: row.rejectionNote ? String(row.rejectionNote) : "",
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt ?? ""),
    reviewedAt:
      row.reviewedAt instanceof Date
        ? row.reviewedAt.toISOString()
        : row.reviewedAt
          ? String(row.reviewedAt)
          : undefined,
    student:
      student && typeof student === "object"
        ? {
            _id: String(student._id ?? ""),
            name: studentName,
            email: student.email ? String(student.email) : undefined,
          }
        : { _id: String(row.studentId ?? ""), name: studentName },
    course:
      course && typeof course === "object"
        ? { _id: String(course._id ?? ""), title: String(course.title ?? "") }
        : { _id: String(row.courseId ?? ""), title: "Course" },
    batch:
      batch && typeof batch === "object"
        ? { _id: String(batch._id ?? ""), name: String(batch.name ?? "") }
        : undefined,
  };
}
