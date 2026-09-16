import mongoose from "mongoose";
import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import Batch from "@/models/Batch";
import { toObjectId } from "@/app/api/_lib/phase12";
import { accessGrantingPaymentQuery, enrollmentGrantsAccess } from "@/lib/subscription/plan";

const ACTIVE_ENROLLMENT_STATUSES = ["enrolled", "in_progress", "completed"] as const;

type EnrollmentAccessLean = {
  course?: unknown;
  status?: string;
  paymentStatus?: string;
  billingPlan?: string;
  accessExpiresAt?: Date | null;
  accessBlocked?: boolean;
  paymentDueAt?: Date | null;
};

type BatchEnrollmentAccessLean = {
  batchId?: unknown;
  paymentStatus?: string;
  billingPlan?: string;
  accessExpiresAt?: Date | null;
  accessBlocked?: boolean;
  paymentDueAt?: Date | null;
};

/**
 * Paid + active enrollment that also passes staff block and subscription checks.
 * Mirrors `canLearnWithEnrollment` for paid courses in studentEnrollment.ts.
 */
function grantsCourseAccess(row: EnrollmentAccessLean): boolean {
  if (
    !ACTIVE_ENROLLMENT_STATUSES.includes(
      row.status as (typeof ACTIVE_ENROLLMENT_STATUSES)[number],
    )
  ) {
    return false;
  }
  return enrollmentGrantsAccess(row);
}

/**
 * Course IDs a student can access via:
 * - paid/active `Enrollment` (recorded + live course placements)
 * - paid/active `BatchEnrollment` (legacy / standalone live batches)
 *
 * Honors accessBlocked + monthly subscription expiry.
 */
export async function studentAccessibleCourseIds(
  studentId: string,
): Promise<mongoose.Types.ObjectId[]> {
  const studentOid = toObjectId(studentId);
  const unique = new Set<string>();

  const [enrolled, batchEnrolled] = await Promise.all([
    Enrollment.find({
      student: studentOid,
      status: { $in: [...ACTIVE_ENROLLMENT_STATUSES] },
      accessBlocked: { $ne: true },
      ...accessGrantingPaymentQuery(),
    })
      .select("course billingPlan accessExpiresAt accessBlocked paymentDueAt status paymentStatus")
      .lean<EnrollmentAccessLean[]>(),
    BatchEnrollment.find({
      studentId: studentOid,
      status: "active",
      accessBlocked: { $ne: true },
      ...accessGrantingPaymentQuery(),
    })
      .select("batchId billingPlan accessExpiresAt accessBlocked paymentDueAt paymentStatus")
      .lean<BatchEnrollmentAccessLean[]>(),
  ]);

  for (const row of enrolled) {
    if (!grantsCourseAccess(row)) continue;
    if (row.course) unique.add(String(row.course));
  }

  const batchIds = batchEnrolled
    .filter((row) => enrollmentGrantsAccess(row))
    .map((row) => String(row.batchId || ""))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (batchIds.length) {
    const batches = await Batch.find({ _id: { $in: batchIds } })
      .select("courseId")
      .lean();
    for (const batch of batches) {
      if (batch.courseId) unique.add(String(batch.courseId));
    }
  }

  return Array.from(unique)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

export async function studentCanAccessCourse(
  studentId: string,
  courseId: unknown,
): Promise<boolean> {
  const id = String(courseId ?? "");
  if (!mongoose.Types.ObjectId.isValid(id)) return false;

  const accessible = await studentAccessibleCourseIds(studentId);
  return accessible.some((oid) => String(oid) === id);
}
