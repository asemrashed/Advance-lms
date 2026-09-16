import type { CourseType, LessonType } from "@/types/unifiedCourse";

export const COURSE_TYPES: CourseType[] = ["recorded", "live"];

export const LESSON_TYPES: LessonType[] = ["recorded", "pdf", "text", "live"];

export const RECORDED_LESSON_TYPES: LessonType[] = ["recorded", "pdf", "text"];

export function normalizeCourseType(value: unknown): CourseType {
  return value === "live" ? "live" : "recorded";
}

export function normalizeLessonType(value: unknown): LessonType {
  if (
    value === "pdf" ||
    value === "text" ||
    value === "live" ||
    value === "recorded"
  ) {
    return value;
  }
  return "recorded";
}

export function isLiveCourseType(courseType: CourseType | undefined): boolean {
  return courseType === "live";
}

export function courseAllowsDirectEnrollment(
  courseType: CourseType | undefined,
): boolean {
  return !isLiveCourseType(courseType);
}

export function lessonTypeAllowedForCourse(
  courseType: CourseType,
  lessonType: LessonType,
): boolean {
  if (lessonType === "live") {
    return isLiveCourseType(courseType);
  }
  return true;
}

export function liveCoursePricingError(courseType: CourseType): string | null {
  if (isLiveCourseType(courseType)) {
    return "Live courses do not support direct course enrollment; select a batch to enroll";
  }
  return null;
}

export function assertBatchIdForLiveChapter(
  courseType: CourseType,
  batchId: string | undefined,
): string | null {
  // Live-course curriculum is now shared at the course level (no batchId).
  // Recorded courses still must not scope chapters to a batch.
  if (!isLiveCourseType(courseType) && batchId) {
    return "Recorded courses cannot scope chapters to a batch";
  }
  return null;
}
