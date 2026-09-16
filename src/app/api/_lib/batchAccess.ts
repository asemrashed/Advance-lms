import { NextResponse } from "next/server";
import Batch from "@/models/Batch";
import BatchEnrollment from "@/models/BatchEnrollment";
import Chapter from "@/models/Chapter";
import Enrollment from "@/models/Enrollment";
import RoutineSlot from "@/models/RoutineSlot";
import { ensureMongooseModelsRegistered } from "@/lib/registerMongooseModels";
import { isObjectId, toObjectId, type SessionUser } from "@/app/api/_lib/phase12";
import { normalizeBatchGrade } from "@/lib/batchGrades";
import {
  batchHasInstructor,
  resolveBatchInstructorIds,
} from "@/app/api/_lib/batchInstructors";
import { ensureRoutineSlotsMigrated } from "@/app/api/_lib/legacyRoutineMigrate";
import { mapRoutineSlot } from "@/app/api/_lib/mapBatchClass";
import { canManageCourse } from "@/app/api/_lib/courseAccess";
import Course from "@/models/Course";
import {
  accessGrantingPaymentQuery,
  enrollmentGrantsAccess,
} from "@/lib/subscription/plan";
import { listActivePaidBatchStudentIds } from "@/app/api/_lib/liveEnrollment";
import { isAdminAreaRole } from "@/lib/roles";

const ACTIVE_COURSE_ENROLLMENT_STATUSES = [
  "enrolled",
  "in_progress",
  "completed",
] as const;

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export function weekdayShort(dayOfWeek: number) {
  return WEEKDAY_SHORT[dayOfWeek] ?? "?";
}

export function buildWeeklyRoutineFromSlots(
  slots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    topic: string;
    instructorName?: string;
    status: string;
    _id: string;
    chapterTitle?: string;
    batchClassTitle?: string;
  }[],
) {
  const days = WEEKDAY_LABELS.map((label, dayOfWeek) => ({
    dayOfWeek,
    label,
    shortLabel: weekdayShort(dayOfWeek),
    slots: [] as typeof slots,
  }));

  for (const slot of slots) {
    const day = days[slot.dayOfWeek];
    if (day) day.slots.push(slot);
  }

  for (const day of days) {
    day.slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return days;
}

/**
 * Active, paid students per batch — unions `BatchEnrollment` and live
 * `Enrollment.selectedBatchId` placements (deduped by student).
 */
export async function countActivePaidEnrollmentsByBatchIds(
  batchIds: unknown[],
): Promise<Map<string, number>> {
  if (batchIds.length === 0) return new Map();

  const ids = batchIds.map((id) => String(id)).filter((id) => isObjectId(id));
  const entries = await Promise.all(
    ids.map(
      async (id) =>
        [id, (await listActivePaidBatchStudentIds(id)).length] as const,
    ),
  );
  return new Map(entries);
}

export function mapBatch(
  row: Record<string, unknown>,
  options?: { enrolledCount?: number },
) {
  const instructorIds = resolveBatchInstructorIds(row);
  const grade = normalizeBatchGrade(
    row.grade ??
      (typeof row.category === "string" ? row.category : undefined),
  );

  return {
    _id: String(row._id),
    name: row.name,
    courseId: row.courseId ? String(row.courseId) : undefined,
    subject: row.subject ?? "",
    grade,
    instructorId: instructorIds[0] ?? "",
    instructorIds,
    schedule: Array.isArray(row.schedule) ? row.schedule : [],
    startDate: (row.startDate as Date)?.toISOString?.() ?? row.startDate,
    endDate: (row.endDate as Date)?.toISOString?.() ?? row.endDate,
    maxStudents: row.maxStudents,
    monthlyFee: typeof row.monthlyFee === "number" && row.monthlyFee > 0 ? row.monthlyFee : undefined,
    isActive: Boolean(row.isActive),
    description: row.description,
    shortDescription: row.shortDescription,
    thumbnailUrl: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    features: Array.isArray(row.features) ? row.features : [],
    meetLink: typeof row.meetLink === "string" ? row.meetLink.trim() || undefined : undefined,
    enrolledCount: options?.enrolledCount ?? 0,
    createdAt: (row.createdAt as Date)?.toISOString?.() ?? row.createdAt,
    updatedAt: (row.updatedAt as Date)?.toISOString?.() ?? row.updatedAt,
  };
}

export function isBatchAdmin(user: SessionUser) {
  return isAdminAreaRole(user.role);
}

/**
 * Whether this user can run teaching ops on the batch (settings, routine,
 * live classes, attendance). Admin, batch instructor, or parent-course owner.
 */
export async function canManageBatchTeaching(
  user: SessionUser,
  batch: {
    courseId?: unknown;
    instructorIds?: unknown[];
    instructorId?: unknown;
  },
): Promise<boolean> {
  if (isAdminAreaRole(user.role)) return true;
  if (user.role !== "instructor") return false;
  if (batchHasInstructor(batch, user.id)) return true;

  const courseId = batch.courseId ? String(batch.courseId) : "";
  if (!courseId || !isObjectId(courseId)) return false;

  const course = await Course.findById(courseId)
    .select("instructor createdBy")
    .lean();
  if (!course) return false;
  return canManageCourse(course, user.id, user.role);
}

/** Sync helper — prefer canManageBatchTeaching when course ownership matters. */
export function canManageBatch(
  user: SessionUser,
  batch: { instructorIds?: unknown[]; instructorId?: unknown },
) {
  if (isAdminAreaRole(user.role)) return true;
  if (user.role === "instructor") {
    return batchHasInstructor(batch, user.id);
  }
  return false;
}

/**
 * Resolve the chapter filter for an instructor's assigned curriculum in a batch.
 * Curriculum is shared at the course level, so we match the batch's parent
 * course (plus any legacy per-batch chapters) scoped to the instructor.
 */
async function instructorChapterFilterForBatch(batchId: string, userId: string) {
  const batch = await Batch.findById(batchId).select("courseId").lean();
  const courseScope = batch?.courseId
    ? { course: batch.courseId, $or: [{ batchId: toObjectId(batchId) }, { batchId: { $exists: false } }] }
    : { batchId: toObjectId(batchId) };
  return { ...courseScope, instructorId: toObjectId(userId) };
}

export async function instructorHasChapterInBatch(batchId: string, userId: string) {
  const filter = await instructorChapterFilterForBatch(batchId, userId);
  const count = await Chapter.countDocuments({
    ...filter,
    isPublished: { $ne: false },
  });
  return count > 0;
}

export async function assignedChapterIdsInBatch(batchId: string, userId: string) {
  const filter = await instructorChapterFilterForBatch(batchId, userId);
  const rows = await Chapter.find(filter).select("_id").lean();
  return rows.map((r) => String(r._id));
}

export function canManageChapterCurriculum(
  user: SessionUser,
  chapter: { instructorId?: unknown },
) {
  if (isAdminAreaRole(user.role)) return true;
  if (user.role === "instructor") {
    return String(chapter.instructorId ?? "") === user.id;
  }
  return false;
}

export async function requireChapterCurriculumManage(
  batchId: string,
  chapterId: string,
  user: SessionUser,
) {
  const view = await requireBatchViewAccess(batchId, user);
  if (view.error) return view;

  const chapter = await Chapter.findOne({
    _id: toObjectId(chapterId),
    batchId: toObjectId(batchId),
  }).lean();

  if (!chapter) {
    return {
      error: NextResponse.json(
        { success: false, error: "Chapter not found" },
        { status: 404 },
      ),
      batch: null,
      chapter: null,
    };
  }

  if (!canManageChapterCurriculum(user, chapter)) {
    return {
      error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
      batch: null,
      chapter: null,
    };
  }

  return { error: null, batch: view.batch, chapter };
}

export async function hasActiveBatchEnrollment(batchId: string, studentId: string) {
  const row = await BatchEnrollment.findOne({
    batchId,
    studentId,
    status: "active",
    ...accessGrantingPaymentQuery(),
  })
    .select("_id paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt")
    .lean();
  if (row && enrollmentGrantsAccess(row)) return true;

  // Live course enrollments place students via Enrollment.selectedBatchId.
  const courseRow = await Enrollment.findOne({
    student: studentId,
    selectedBatchId: batchId,
    status: { $in: [...ACTIVE_COURSE_ENROLLMENT_STATUSES] },
    accessBlocked: { $ne: true },
    ...accessGrantingPaymentQuery(),
  })
    .select("_id paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt")
    .lean();
  if (!courseRow) return false;
  return enrollmentGrantsAccess(courseRow);
}

export async function requireBatchById(batchId: string) {
  if (!isObjectId(batchId)) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid batch id" },
        { status: 400 },
      ),
      batch: null,
    };
  }

  const batch = await Batch.findById(batchId).lean();
  if (!batch) {
    return {
      error: NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 },
      ),
      batch: null,
    };
  }

  return { error: null, batch };
}

export async function requireBatchViewAccess(batchId: string, user: SessionUser) {
  const resolved = await requireBatchById(batchId);
  if (resolved.error) return resolved;

  const batch = resolved.batch!;

  if (isAdminAreaRole(user.role)) {
    return {
      error: null,
      batch,
      canManage: true,
      canManageRoutine: true,
      assignedChapterIds: [] as string[],
      assignedSubjectIds: [] as string[],
    };
  }

  if (user.role === "instructor") {
    const teachingManage = await canManageBatchTeaching(user, batch);
    const chapterInstructor = await instructorHasChapterInBatch(batchId, user.id);
    if (teachingManage || chapterInstructor) {
      const assignedChapterIds = chapterInstructor
        ? await assignedChapterIdsInBatch(batchId, user.id)
        : [];
      return {
        error: null,
        batch,
        canManage: teachingManage,
        canManageRoutine: teachingManage,
        assignedChapterIds,
        assignedSubjectIds: assignedChapterIds,
      };
    }
  }

  if (user.role === "student") {
    const enrolled = await hasActiveBatchEnrollment(batchId, user.id);
    if (enrolled) {
      return {
        error: null,
        batch,
        canManage: false,
        canManageRoutine: false,
        assignedChapterIds: [] as string[],
        assignedSubjectIds: [] as string[],
      };
    }
  }

  return {
    error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    batch: null,
    canManage: false,
    canManageRoutine: false,
    assignedChapterIds: [] as string[],
    assignedSubjectIds: [] as string[],
  };
}

/** Batch teaching ops (settings, live classes, attendance, routine). */
export async function requireBatchManageAccess(batchId: string, user: SessionUser) {
  const resolved = await requireBatchViewAccess(batchId, user);
  if (resolved.error) return resolved;
  if (!resolved.canManage) {
    return {
      error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
      batch: null,
    };
  }
  return { error: null, batch: resolved.batch };
}

export function instructorBatchFilter(userId: string) {
  const oid = toObjectId(userId);
  return {
    $or: [{ instructorId: oid }, { instructorIds: oid }],
  };
}

export async function instructorAccessibleBatchFilter(userId: string) {
  const base = instructorBatchFilter(userId);
  const orClauses = [...(base.$or as object[])];

  // Legacy per-batch chapter assignments.
  const chapterBatchIds = await Chapter.distinct("batchId", {
    instructorId: toObjectId(userId),
  });
  if (chapterBatchIds.length > 0) {
    orClauses.push({ _id: { $in: chapterBatchIds } });
  }

  // Course-level chapter assignments → grant access to that course's batches.
  const chapterCourseIds = await Chapter.distinct("course", {
    instructorId: toObjectId(userId),
  });
  if (chapterCourseIds.length > 0) {
    orClauses.push({ courseId: { $in: chapterCourseIds } });
  }

  // Courses this instructor owns / created → all their batch sections.
  const ownedCourseIds = await Course.distinct("_id", {
    $or: [
      { instructor: toObjectId(userId) },
      { createdBy: toObjectId(userId) },
    ],
  });
  if (ownedCourseIds.length > 0) {
    orClauses.push({ courseId: { $in: ownedCourseIds } });
  }

  return { $or: orClauses };
}

export async function studentEnrolledBatchIds(studentId: string) {
  const [batchRows, courseRows] = await Promise.all([
    BatchEnrollment.find({
      studentId,
      status: "active",
      ...accessGrantingPaymentQuery(),
    })
      .select("batchId paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt")
      .lean(),
    Enrollment.find({
      student: studentId,
      selectedBatchId: { $exists: true, $ne: null },
      status: { $in: [...ACTIVE_COURSE_ENROLLMENT_STATUSES] },
      accessBlocked: { $ne: true },
      ...accessGrantingPaymentQuery(),
    })
      .select("selectedBatchId paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt")
      .lean(),
  ]);

  const ids = new Set<string>();
  for (const row of batchRows) {
    if (enrollmentGrantsAccess(row) && row.batchId) {
      ids.add(String(row.batchId));
    }
  }
  for (const row of courseRows) {
    if (enrollmentGrantsAccess(row) && row.selectedBatchId) {
      ids.add(String(row.selectedBatchId));
    }
  }
  return [...ids].map((id) => toObjectId(id));
}

export async function listRoutineSlotsForBatch(batchId: string) {
  ensureMongooseModelsRegistered();
  await ensureRoutineSlotsMigrated(batchId);
  const rows = await RoutineSlot.find({ batchId: toObjectId(batchId) })
    .populate("instructorId", "name email")
    .populate("chapterId", "title subjectLabel")
    .sort({ dayOfWeek: 1, startTime: 1 })
    .lean();

  return rows.map((r) => mapRoutineSlot(r as Record<string, unknown>));
}
