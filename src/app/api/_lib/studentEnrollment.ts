import mongoose from "mongoose";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import { toObjectId } from "@/app/api/_lib/lessonQuiz";
import { enrollmentGrantsAccess } from "@/lib/subscription/plan";

const ACTIVE_STATUSES = ["enrolled", "in_progress", "completed"] as const;

export type StudentCourseAccessResult =
  | { ok: true; enrollment: { _id: mongoose.Types.ObjectId } }
  | { ok: false; status: number; error: string };

type EnrollmentAccessFields = {
  status: string;
  paymentStatus: string;
  billingPlan?: string;
  accessExpiresAt?: Date | null;
  accessBlocked?: boolean;
  paymentDueAt?: Date | null;
};

function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);
}

function canLearnWithEnrollment(
  enrollment: EnrollmentAccessFields,
  courseIsPaid: boolean,
): boolean {
  if (!isActiveStatus(enrollment.status)) return false;
  if (enrollment.accessBlocked) return false;
  if (!courseIsPaid) return true;
  return enrollmentGrantsAccess(enrollment);
}

/**
 * Ensures the student may learn (progress, quizzes). Auto-creates enrollment for free courses.
 * Paid courses require active status and paymentStatus paid (not suspended checkout).
 */
export async function ensureStudentCourseAccess(
  studentId: string,
  courseId: string,
  options?: { autoEnrollIfFree?: boolean },
): Promise<StudentCourseAccessResult> {
  const autoEnrollIfFree = options?.autoEnrollIfFree !== false;
  const studentOid = toObjectId(studentId);
  const courseOid = toObjectId(courseId);
  if (!studentOid || !courseOid) {
    return { ok: false, status: 400, error: "Invalid student or course ID" };
  }

  const course = await Course.findOne({
    _id: courseOid,
    status: "published",
    isHidden: { $ne: true },
  })
    .select("_id isPaid")
    .lean();

  if (!course) {
    return { ok: false, status: 404, error: "Course not found or not available" };
  }

  const courseIsPaid = Boolean(course.isPaid);

  const enrollment = await Enrollment.findOne({
    student: studentOid,
    course: courseOid,
  })
    .select("_id status paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt")
    .lean();

  if (enrollment && canLearnWithEnrollment(enrollment, courseIsPaid)) {
    return { ok: true, enrollment: { _id: enrollment._id as mongoose.Types.ObjectId } };
  }

  if (enrollment) {
    if (enrollment.accessBlocked) {
      return {
        ok: false,
        status: 403,
        error: "Your access to this course has been blocked. Please contact support.",
      };
    }
    if (
      courseIsPaid &&
      enrollment.paymentStatus === "paid" &&
      !enrollmentGrantsAccess(enrollment)
    ) {
      return {
        ok: false,
        status: 403,
        error: "Your subscription has expired. Please renew to continue.",
      };
    }
    if (enrollment.paymentStatus === "pending" || enrollment.status === "suspended") {
      return {
        ok: false,
        status: 403,
        error: enrollment.paymentDueAt
          ? "Your 1-month payment window has ended. Complete payment to continue."
          : "Complete payment to access this course",
      };
    }
    return {
      ok: false,
      status: 403,
      error: "Enrollment is not active for this course",
    };
  }

  if (!courseIsPaid && autoEnrollIfFree) {
    try {
      const created = await Enrollment.create({
        student: studentOid,
        course: courseOid,
        status: "enrolled",
        paymentStatus: "paid",
        paymentAmount: 0,
      });
      return { ok: true, enrollment: { _id: created._id } };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("E11000")) {
        const again = await Enrollment.findOne({
          student: studentOid,
          course: courseOid,
        })
          .select("_id status paymentStatus")
          .lean();
        if (again && canLearnWithEnrollment(again, courseIsPaid)) {
          return { ok: true, enrollment: { _id: again._id as mongoose.Types.ObjectId } };
        }
      }
      throw err;
    }
  }

  return {
    ok: false,
    status: 403,
    error: courseIsPaid
      ? "Enrollment required for this course"
      : "Enrollment required for this course",
  };
}

export async function hasActivePaidEnrollment(
  studentId: string,
  courseId: string,
): Promise<boolean> {
  const access = await ensureStudentCourseAccess(studentId, courseId, {
    autoEnrollIfFree: false,
  });
  return access.ok;
}
