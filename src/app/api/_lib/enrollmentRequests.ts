import mongoose from "mongoose";
import { type IEnrollmentRequest } from "@/models/EnrollmentRequest";
import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import Payment from "@/models/Payment";
import Batch from "@/models/Batch";
import { countPaidBatchPlacements } from "@/app/api/_lib/liveEnrollment";
import { computeAccessExpiry, normalizeBillingPlan } from "@/lib/subscription/plan";
import { getInstructorScopeIds } from "@/app/api/_lib/paymentQueries";
import { makeTransactionId } from "@/app/api/_lib/paymentShared";
import { getDisplayName } from "@/lib/displayName";
import Course from "@/models/Course";
import {
  resolveAmountForStudent,
  resolveBatchAmountForStudent,
  buildPaymentDiscountMeta,
} from "@/lib/courses/studentPricing";
import { coursePricingFromLean } from "@/lib/courses/liveCoursePricing";

/** Whether an instructor owns the course/batch this request targets. */
export async function canInstructorReviewRequest(
  request: Pick<IEnrollmentRequest, "entityType" | "courseId" | "batchId">,
  instructorId: string,
): Promise<boolean> {
  const { courseIds, batchIds } = await getInstructorScopeIds(instructorId);
  if (request.entityType === "course" && request.courseId) {
    return courseIds.map(String).includes(String(request.courseId));
  }
  if (request.entityType === "batch" && request.batchId) {
    return batchIds.map(String).includes(String(request.batchId));
  }
  return false;
}

/** Instructor-scoped filter clause for listing requests on owned courses/batches. */
export async function instructorRequestScope(
  instructorId: string,
): Promise<Record<string, unknown>> {
  const { courseIds, batchIds } = await getInstructorScopeIds(instructorId);
  const or: Record<string, unknown>[] = [];
  if (courseIds.length) or.push({ courseId: { $in: courseIds } });
  if (batchIds.length) or.push({ batchId: { $in: batchIds } });
  if (or.length === 0) return { _id: { $in: [] } };
  return { $or: or };
}

/**
 * Approve a pending cash request: activate the enrollment with plan-aware
 * access window and record a `cash` Payment so it shows in payment history.
 */
export async function approveEnrollmentRequest(
  request: IEnrollmentRequest,
  reviewerId: string,
): Promise<void> {
  const plan = normalizeBillingPlan(request.billingPlan);
  let amount = Math.max(0, Number(request.amount) || 0);
  let discountMeta: ReturnType<typeof buildPaymentDiscountMeta> = {
    discountApplied: false,
  };

  if (request.entityType === "batch" && request.batchId) {
    const batch = await Batch.findById(request.batchId)
      .select("monthlyFee courseId")
      .lean();
    const parentCourseDoc = batch?.courseId
      ? await Course.findById(batch.courseId)
          .select("isPaid price salePrice monthlyPrice")
          .lean()
      : null;
    if (batch) {
      const pricing = await resolveBatchAmountForStudent(
        batch,
        parentCourseDoc ? coursePricingFromLean(parentCourseDoc) : null,
        plan,
        String(request.studentId),
      );
      amount = pricing.finalAmount;
      discountMeta = buildPaymentDiscountMeta(pricing);
    }
  } else if (request.entityType === "course" && request.courseId) {
    const course = await Course.findById(request.courseId)
      .select("isPaid price salePrice monthlyPrice")
      .lean();
    if (course) {
      const pricing = await resolveAmountForStudent(
        request.courseId,
        {
          isPaid: course.isPaid,
          price: course.price,
          salePrice: course.salePrice,
          monthlyPrice: (course as { monthlyPrice?: number }).monthlyPrice,
        },
        plan,
        String(request.studentId),
      );
      amount = pricing.finalAmount;
      discountMeta = buildPaymentDiscountMeta(pricing);
    }
  }

  const now = new Date();
  const transactionId = makeTransactionId(String(request.studentId), true);

  let enrollmentId: mongoose.Types.ObjectId | undefined;
  let batchEnrollmentId: mongoose.Types.ObjectId | undefined;

  if (request.entityType === "batch" && request.batchId) {
    const existing = await BatchEnrollment.findOne({
      batchId: request.batchId,
      studentId: request.studentId,
    })
      .select("accessExpiresAt")
      .lean();
    const expiry = computeAccessExpiry(
      plan,
      (existing?.accessExpiresAt as Date | undefined) ?? null,
      now,
    );
    const set: Record<string, unknown> = {
      status: "active",
      paymentStatus: "paid",
      billingPlan: plan,
      paymentAmount: amount,
      paymentId: transactionId,
      accessBlocked: false,
    };
    const unset: Record<string, unknown> = { paymentDueAt: "" };
    if (expiry) set.accessExpiresAt = expiry;
    else unset.accessExpiresAt = "";

    const doc = await BatchEnrollment.findOneAndUpdate(
      { batchId: request.batchId, studentId: request.studentId },
      { $set: set, $unset: unset },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    batchEnrollmentId = doc?._id;
  } else if (request.entityType === "course" && request.courseId) {
    const existing = await Enrollment.findOne({
      student: request.studentId,
      course: request.courseId,
    })
      .select("accessExpiresAt")
      .lean();
    const expiry = computeAccessExpiry(
      plan,
      (existing?.accessExpiresAt as Date | undefined) ?? null,
      now,
    );
    const set: Record<string, unknown> = {
      status: "enrolled",
      paymentStatus: "paid",
      billingPlan: plan,
      paymentAmount: amount,
      paymentId: transactionId,
      paymentMethod: "cash",
      accessBlocked: false,
      selectedBatchId: request.batchId,
    };
    const unset: Record<string, unknown> = { paymentDueAt: "" };
    if (expiry) set.accessExpiresAt = expiry;
    else unset.accessExpiresAt = "";

    const doc = await Enrollment.findOneAndUpdate(
      { student: request.studentId, course: request.courseId },
      { $set: set, $unset: unset },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    enrollmentId = doc?._id;

    if (request.batchId) {
      const batch = await Batch.findById(request.batchId).select("_id maxStudents").lean();
      if (batch) {
        const maxStudents = Number(batch.maxStudents) || 0;
        if (maxStudents > 0) {
          const activeCount = await countPaidBatchPlacements(
            request.batchId,
            String(request.studentId),
          );
          if (activeCount >= maxStudents) {
            await Enrollment.updateOne(
              { _id: enrollmentId },
              { $set: { status: "suspended" } },
            );
          }
        }
      }
    }
  }

  if (amount > 0) {
    await Payment.create({
      user: request.studentId,
      entityType: request.entityType,
      course: request.courseId,
      enrollment: enrollmentId,
      batchId: request.batchId,
      batchEnrollment: batchEnrollmentId,
      billingPlan: plan,
      amount,
      ...discountMeta,
      transactionId,
      gateway: "cash",
      gatewayOrderId: transactionId,
      status: "success",
      gatewayResponse: {
        source: "cash",
        enrollmentRequestId: String(request._id),
        proofUrls: request.proofUrls,
        approvedBy: reviewerId,
      },
    });
  }

  request.status = "approved";
  request.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
  request.reviewedAt = now;
  request.enrollmentId = enrollmentId;
  request.batchEnrollmentId = batchEnrollmentId;
  await request.save();
}

export function mapEnrollmentRequest(row: Record<string, unknown>) {
  const student = row.studentId as Record<string, unknown> | undefined;
  const course = row.courseId as Record<string, unknown> | undefined;
  const batch = row.batchId as Record<string, unknown> | undefined;
  const studentName =
    student && typeof student === "object"
      ? getDisplayName(student) ||
        String(student.name || student.email || "Student")
      : "Student";

  return {
    _id: String(row._id),
    status: row.status,
    entityType: row.entityType,
    billingPlan: row.billingPlan,
    amount: row.amount ?? null,
    proofUrls: Array.isArray(row.proofUrls)
      ? row.proofUrls
          .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
          .map((u) => {
            const trimmed = u.trim();
            // Strip localhost absolute URLs baked in from bad proxies / old saves.
            try {
              if (/^https?:\/\//i.test(trimmed)) {
                const parsed = new URL(trimmed);
                const host = parsed.hostname.toLowerCase();
                if (
                  host === "localhost" ||
                  host === "127.0.0.1" ||
                  host === "::1" ||
                  parsed.pathname.startsWith("/uploads/")
                ) {
                  return `${parsed.pathname}${parsed.search}`;
                }
              }
            } catch {
              /* keep original */
            }
            return trimmed;
          })
      : [],
    note: row.note ?? "",
    rejectionNote: row.rejectionNote ?? "",
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
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
        : undefined,
    batch:
      batch && typeof batch === "object"
        ? { _id: String(batch._id ?? ""), name: String(batch.name ?? "") }
        : undefined,
  };
}
