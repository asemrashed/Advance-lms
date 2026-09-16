import { getInstructorDisplayName } from "@/app/api/_lib/instructorProfile";
import { buildWeeklyRoutineFromSlots } from "@/app/api/_lib/batchAccess";
import { resolveBatchEnrollmentFee } from "@/lib/courses/liveCoursePricing";
import { resolveBatchInstructorIds } from "@/app/api/_lib/batchInstructors";
import { normalizeBatchGrade } from "@/lib/batchGrades";

export type PublicBatchRow = {
  _id: string;
  courseId?: string;
  name: string;
  subject: string;
  grade: string;
  startDate: string;
  endDate: string;
  coursePrice: number;
  /** Monthly fee when monthly plan is offered (> 0). */
  monthlyFee?: number;
  courseIsPaid: boolean;
  maxStudents: number;
  enrolledCount: number;
  seatsRemaining: number;
  isFull: boolean;
  shortDescription: string;
  thumbnailUrl: string;
  videoUrl?: string;
  features: string[];
  description?: string;
  instructorIds: string[];
  instructorName: string;
  instructorAvatar?: string;
};

type CoursePricing = {
  isPaid?: boolean;
  price?: number;
  salePrice?: number;
  monthlyPrice?: number;
};

export function mapPublicBatch(
  row: Record<string, unknown>,
  enrolledCount: number,
  coursePricing?: CoursePricing | null,
): PublicBatchRow {
  const maxStudents = Number(row.maxStudents) || 0;
  const instructor = row.instructorId as Record<string, unknown> | null;
  const instructorPopulated =
    instructor && typeof instructor === "object" && "_id" in instructor;

  const description =
    typeof row.description === "string" ? row.description : undefined;
  const shortDescription =
    typeof row.shortDescription === "string" && row.shortDescription.trim()
      ? row.shortDescription.trim()
      : description
        ? description.slice(0, 160)
        : String(row.name ?? "");

  const grade = normalizeBatchGrade(
    row.grade ?? (typeof row.category === "string" ? row.category : undefined),
  );

  const coursePrice = resolveBatchEnrollmentFee(
    {},
    coursePricing,
  );
  const courseIsPaid = coursePricing ? Boolean(coursePricing.isPaid) : coursePrice > 0;

  const monthlyFee =
    coursePricing && typeof coursePricing.monthlyPrice === "number" && coursePricing.monthlyPrice > 0
      ? coursePricing.monthlyPrice
      : Number(row.monthlyFee) > 0
        ? Number(row.monthlyFee)
        : undefined;

  return {
    _id: String(row._id),
    courseId: row.courseId ? String(row.courseId) : undefined,
    name: String(row.name ?? ""),
    subject: String(row.subject ?? ""),
    grade,
    startDate:
      (row.startDate as Date)?.toISOString?.() ?? String(row.startDate ?? ""),
    endDate:
      (row.endDate as Date)?.toISOString?.() ?? String(row.endDate ?? ""),
    coursePrice,
    monthlyFee,
    courseIsPaid,
    maxStudents,
    enrolledCount,
    seatsRemaining: Math.max(0, maxStudents - enrolledCount),
    isFull: enrolledCount >= maxStudents && maxStudents > 0,
    shortDescription,
    thumbnailUrl:
      typeof row.thumbnailUrl === "string" && row.thumbnailUrl.trim()
        ? row.thumbnailUrl.trim()
        : "",
    videoUrl:
      typeof row.videoUrl === "string" && row.videoUrl.trim()
        ? row.videoUrl.trim()
        : undefined,
    features: Array.isArray(row.features)
      ? row.features.map((f) => String(f)).filter(Boolean)
      : [],
    description,
    instructorIds: resolveBatchInstructorIds(row),
    instructorName: instructorPopulated
      ? getInstructorDisplayName(instructor)
      : "Instructor",
    instructorAvatar:
      instructorPopulated && instructor.avatar
        ? String(instructor.avatar)
        : undefined,
  };
}

export function publicBatchDetailExtras(
  slots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    topic: string;
    instructorName?: string;
    status: string;
    _id: string;
    batchClassTitle?: string;
  }[],
) {
  return {
    routine: buildWeeklyRoutineFromSlots(slots),
  };
}
