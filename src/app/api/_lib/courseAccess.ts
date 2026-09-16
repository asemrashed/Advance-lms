import { isAdminAreaRole } from "@/lib/roles";
/** Resolve a course user ref (ObjectId or populated user) to a string id. */
export function resolveCourseUserId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id?: unknown })._id ?? "");
  }
  return String(value);
}

export function canManageCourse(
  course: { instructor?: unknown; createdBy?: unknown },
  userId: string,
  role: string,
): boolean {
  if (isAdminAreaRole(role)) return true;
  if (role !== "instructor") return false;
  const courseInstructor = resolveCourseUserId(course.instructor);
  const courseCreator = resolveCourseUserId(course.createdBy);
  return courseInstructor === userId || courseCreator === userId;
}
