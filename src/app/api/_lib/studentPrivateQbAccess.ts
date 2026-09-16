import Batch from "@/models/Batch";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import QBAccessRequest, {
  type QBAccessScopeType,
} from "@/models/QBAccessRequest";
import { studentEnrolledBatchIds } from "@/app/api/_lib/batchAccess";
import { resolveBatchInstructorIds } from "@/app/api/_lib/batchInstructors";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";
import { isSubscriptionActive } from "@/lib/subscription/plan";

export type StudentPrivateQbGrant = {
  scopeType: QBAccessScopeType;
  subjectId?: string;
  subjectCode?: string;
  subjectName?: string;
  grade?: string;
  topics: string[];
};

/** Active paid course enrollments (subscription-aware). */
export async function studentHasActivePaidCourseEnrollment(
  studentId: string,
): Promise<boolean> {
  const ids = await studentActivePaidCourseIds(studentId);
  return ids.length > 0;
}

/** Course IDs the student currently has paid, unblocked access to. */
export async function studentActivePaidCourseIds(
  studentId: string,
): Promise<string[]> {
  const rows = await Enrollment.find({
    student: studentId,
    paymentStatus: "paid",
    status: { $in: ["enrolled", "in_progress", "completed"] },
    accessBlocked: { $ne: true },
  })
    .select("course billingPlan accessExpiresAt accessBlocked paymentDueAt")
    .lean();

  return rows
    .filter((row) => isSubscriptionActive(row) && row.course)
    .map((row) => String(row.course));
}

/**
 * Instructors tied to the student's active course/batch enrollments
 * (course owner, batch instructors, chapter instructors).
 */
export async function resolveStudentTeachingInstructorIds(
  studentId: string,
): Promise<string[]> {
  const [courseRows, batchIds] = await Promise.all([
    Enrollment.find({
      student: studentId,
      paymentStatus: "paid",
      status: { $in: ["enrolled", "in_progress", "completed"] },
    })
      .select("course billingPlan accessExpiresAt accessBlocked paymentDueAt")
      .lean(),
    studentEnrolledBatchIds(studentId),
  ]);

  const courseIds = courseRows
    .filter((row) => isSubscriptionActive(row))
    .map((row) => row.course);

  const instructorIds = new Set<string>();
  const parentCourseIds: unknown[] = [...courseIds];

  if (courseIds.length) {
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select("instructor createdBy")
      .lean();
    for (const course of courses) {
      if (course.instructor) instructorIds.add(String(course.instructor));
      if (course.createdBy) instructorIds.add(String(course.createdBy));
    }
  }

  if (batchIds.length) {
    const batches = await Batch.find({ _id: { $in: batchIds } })
      .select("instructorId instructorIds courseId")
      .lean();
    for (const batch of batches) {
      for (const id of resolveBatchInstructorIds(batch)) {
        instructorIds.add(id);
      }
      if (batch.courseId) parentCourseIds.push(batch.courseId);
    }
  }

  const uniqueParentIds = Array.from(
    new Set(parentCourseIds.map((id) => String(id)).filter(Boolean)),
  ).map((id) => toObjectId(id));

  if (batchIds.length && uniqueParentIds.length) {
    const parentCourses = await Course.find({ _id: { $in: uniqueParentIds } })
      .select("instructor createdBy")
      .lean();
    for (const course of parentCourses) {
      if (course.instructor) instructorIds.add(String(course.instructor));
      if (course.createdBy) instructorIds.add(String(course.createdBy));
    }
  }

  const chapterOr: Record<string, unknown>[] = [];
  if (batchIds.length) chapterOr.push({ batchId: { $in: batchIds } });
  if (uniqueParentIds.length) chapterOr.push({ course: { $in: uniqueParentIds } });
  if (chapterOr.length) {
    const chapterInstructorIds = await Chapter.distinct("instructorId", {
      instructorId: { $exists: true },
      $or: chapterOr,
    });
    for (const id of chapterInstructorIds) {
      if (id) instructorIds.add(String(id));
    }
  }

  return Array.from(instructorIds);
}

/** Active admin-QB grants held by instructors of the student's courses. */
export async function listStudentInheritedPrivateQbGrants(
  studentId: string,
): Promise<StudentPrivateQbGrant[]> {
  const instructorIds = await resolveStudentTeachingInstructorIds(studentId);
  if (!instructorIds.length) return [];

  const now = new Date();
  const rows = await QBAccessRequest.find({
    requesterId: { $in: instructorIds.map((id) => toObjectId(id)) },
    status: "approved",
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: now } },
    ],
  })
    .select("scopeType subjectId subjectCode subjectName grade topics")
    .lean();

  return rows.map((row) => ({
    scopeType: ((row.scopeType as QBAccessScopeType) || "full") as QBAccessScopeType,
    subjectId: row.subjectId ? String(row.subjectId) : undefined,
    subjectCode: row.subjectCode ? String(row.subjectCode) : undefined,
    subjectName: row.subjectName ? String(row.subjectName) : undefined,
    grade: row.grade ? String(row.grade) : undefined,
    topics: Array.isArray(row.topics)
      ? (row.topics as unknown[]).map((t) => String(t).trim()).filter(Boolean)
      : [],
  }));
}

function grantCoversSubject(
  grant: StudentPrivateQbGrant,
  subject: string,
): boolean {
  if (grant.scopeType === "full") return true;
  const needle = subject.trim().toLowerCase();
  if (!needle) return false;
  if (grant.subjectName && grant.subjectName.trim().toLowerCase() === needle) {
    return true;
  }
  // subjectCode / subjectId matching happens in Mongo filter via $or fields
  return Boolean(grant.subjectCode || grant.subjectId);
}

function grantCoversTopic(
  grant: StudentPrivateQbGrant,
  topic: string | undefined,
): boolean {
  if (grant.scopeType !== "topics") return true;
  if (!topic) return false;
  return grant.topics.includes(topic.trim());
}

/**
 * Mongo clause for admin private/shared questions covered by instructor grants.
 * Returns null when the student has no inherited grants.
 */
export function buildInheritedPrivateQuestionMatch(
  grants: StudentPrivateQbGrant[],
  options?: { subject?: string; topic?: string },
): Record<string, unknown> | null {
  if (!grants.length) return null;

  const subject = options?.subject?.trim();
  const topic = options?.topic?.trim();

  const scopedGrants = subject
    ? grants.filter(
        (g) => grantCoversSubject(g, subject) && grantCoversTopic(g, topic),
      )
    : grants;

  if (!scopedGrants.length) return null;

  const hasFull = scopedGrants.some((g) => g.scopeType === "full");

  const base: Record<string, unknown> = {
    ownerType: "admin",
    isActive: { $ne: false },
    accessPolicy: { $in: ["private", "shared_with_instructors"] },
  };

  if (subject) {
    base.subject = {
      $regex: `^${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    };
  }
  if (topic) {
    base.topic = topic;
  }

  if (hasFull) {
    return base;
  }

  const subjectClauses: Record<string, unknown>[] = [];
  for (const grant of scopedGrants) {
    const parts: Record<string, unknown>[] = [];
    if (grant.subjectId && isObjectId(String(grant.subjectId))) {
      parts.push({ subjectId: toObjectId(String(grant.subjectId)) });
    }
    if (grant.subjectCode) {
      parts.push({ subjectCode: String(grant.subjectCode).toUpperCase() });
    }
    if (grant.subjectName) {
      parts.push({
        subject: {
          $regex: `^${String(grant.subjectName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      });
    }
    if (!parts.length) continue;

    const clause: Record<string, unknown> = { $or: parts };
    if (grant.grade) clause.grade = String(grant.grade).toUpperCase();
    if (grant.scopeType === "topics" && grant.topics.length) {
      clause.topic = { $in: grant.topics };
    }
    subjectClauses.push(clause);
  }

  if (!subjectClauses.length) return null;

  return {
    ...base,
    $and: [{ $or: subjectClauses }],
  };
}
