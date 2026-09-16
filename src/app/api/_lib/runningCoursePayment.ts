import mongoose from "mongoose";
import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import Course from "@/models/Course";
import {
  computeRunningCoursePaymentDue,
  normalizeBillingPlan,
  type BillingPlan,
} from "@/lib/subscription/plan";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";

const EnrollmentModel = Enrollment as unknown as {
  findOne: (filter: Record<string, unknown>) => ReturnType<typeof Enrollment.findOne>;
  findOneAndUpdate: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => ReturnType<typeof Enrollment.findOneAndUpdate>;
};

function keepExistingDue(existing?: Date | null): Date {
  if (existing && existing.getTime() > Date.now()) return existing;
  return computeRunningCoursePaymentDue();
}

export async function isLiveCourseId(courseId: unknown): Promise<boolean> {
  const id = String(courseId || "");
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return false;
  const course = await Course.findById(id).select("courseType").lean();
  return Boolean(course && normalizeCourseType(course.courseType) === "live");
}

/**
 * Place a student on a running live course with a 1-month pay window.
 * Access stays open until `paymentDueAt` even if payment is still pending.
 */
export async function ensurePendingLiveCourseEnrollment(params: {
  studentId: string;
  courseId: string;
  batchId?: string | null;
  billingPlan?: BillingPlan | string;
  paymentAmount?: number;
  paymentMethod?: "online" | "cash";
}) {
  const plan = normalizeBillingPlan(params.billingPlan);
  const existing = (await EnrollmentModel.findOne({
    student: params.studentId,
    course: params.courseId,
  })
    .select("paymentStatus paymentDueAt status")
    .lean()) as {
    paymentStatus?: string;
    paymentDueAt?: Date;
    status?: string;
  } | null;

  if (existing?.paymentStatus === "paid") {
    return existing;
  }

  const set: Record<string, unknown> = {
    status: "enrolled",
    paymentStatus: "pending",
    billingPlan: plan,
    accessBlocked: false,
    paymentDueAt: keepExistingDue(existing?.paymentDueAt ?? null),
  };
  if (params.batchId) set.selectedBatchId = params.batchId;
  if (params.paymentAmount != null) set.paymentAmount = params.paymentAmount;
  if (params.paymentMethod) set.paymentMethod = params.paymentMethod;

  return EnrollmentModel.findOneAndUpdate(
    { student: params.studentId, course: params.courseId },
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export async function ensurePendingLiveBatchEnrollment(params: {
  studentId: string;
  batchId: string;
  billingPlan?: BillingPlan | string;
  paymentAmount?: number;
}) {
  const plan = normalizeBillingPlan(params.billingPlan);
  const existing = await BatchEnrollment.findOne({
    batchId: params.batchId,
    studentId: params.studentId,
  })
    .select("paymentStatus paymentDueAt")
    .lean();

  if (existing?.paymentStatus === "paid") {
    return existing;
  }

  const set: Record<string, unknown> = {
    status: "active",
    paymentStatus: "pending",
    billingPlan: plan,
    accessBlocked: false,
    paymentDueAt: keepExistingDue(
      (existing?.paymentDueAt as Date | undefined) ?? null,
    ),
  };
  if (params.paymentAmount != null) set.paymentAmount = params.paymentAmount;

  return BatchEnrollment.findOneAndUpdate(
    { batchId: params.batchId, studentId: params.studentId },
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export function paymentDueAtForPendingLive(existingDue?: Date | null): Date {
  return keepExistingDue(existingDue ?? null);
}
