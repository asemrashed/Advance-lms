import mongoose from "mongoose";
import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import { accessGrantingPaymentQuery, enrollmentGrantsAccess } from "@/lib/subscription/plan";

const ACTIVE_ENROLLMENT_STATUSES = ["enrolled", "in_progress", "completed"] as const;

/**
 * Students with paid access to a batch section.
 * Live enrollments are stored on `Enrollment.selectedBatchId`; legacy /
 * standalone batches may still use `BatchEnrollment`. Union both so roster
 * tools (attendance, etc.) match what instructors see in enrollments and
 * what students can access in My Courses.
 */
export async function listActivePaidBatchStudentIds(
  batchId: mongoose.Types.ObjectId | string,
): Promise<string[]> {
  const id = String(batchId);
  if (!mongoose.Types.ObjectId.isValid(id)) return [];

  const oid = new mongoose.Types.ObjectId(id);
  const [batchRows, courseRows] = await Promise.all([
    BatchEnrollment.find({
      batchId: oid,
      status: "active",
      accessBlocked: { $ne: true },
      ...accessGrantingPaymentQuery(),
    })
      .select("studentId paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt")
      .lean(),
    Enrollment.find({
      selectedBatchId: oid,
      status: { $in: [...ACTIVE_ENROLLMENT_STATUSES] },
      accessBlocked: { $ne: true },
      ...accessGrantingPaymentQuery(),
    })
      .select("student paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt")
      .lean(),
  ]);

  const ids = new Set<string>();
  for (const row of batchRows) {
    if (row.studentId && enrollmentGrantsAccess(row)) ids.add(String(row.studentId));
  }
  for (const row of courseRows) {
    if (row.student && enrollmentGrantsAccess(row)) ids.add(String(row.student));
  }
  return [...ids];
}

/** Paid, active course enrollments placed in a live batch section. */
export async function countPaidBatchPlacements(
  batchId: mongoose.Types.ObjectId | string,
  excludeStudentId?: string,
): Promise<number> {
  const ids = await listActivePaidBatchStudentIds(batchId);
  if (!excludeStudentId) return ids.length;
  return ids.filter((sid) => sid !== String(excludeStudentId)).length;
}

export async function hasPaidLiveCourseEnrollment(
  studentId: string,
  courseId: string,
  batchId?: string,
): Promise<boolean> {
  const filter: Record<string, unknown> = {
    student: studentId,
    course: courseId,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    ...accessGrantingPaymentQuery(),
  };
  if (batchId) {
    filter.selectedBatchId = batchId;
  }
  return Boolean(await Enrollment.exists(filter));
}

export async function hasPendingLiveCourseEnrollment(
  studentId: string,
  courseId: string,
  batchId?: string,
): Promise<boolean> {
  const filter: Record<string, unknown> = {
    student: studentId,
    course: courseId,
    paymentStatus: "pending",
    status: { $in: ["suspended", "enrolled"] },
  };
  if (batchId) {
    filter.selectedBatchId = batchId;
  }
  return Boolean(await Enrollment.exists(filter));
}
