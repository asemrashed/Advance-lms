import Batch from "@/models/Batch";
import Course from "@/models/Course";
import { toObjectId } from "@/app/api/_lib/phase12";

/** Courses an instructor can manage via Course.instructor/createdBy or batch assignment. */
export async function instructorAccessibleCourseIds(userId: string) {
  const instructorId = toObjectId(userId);
  const [courses, batches] = await Promise.all([
    Course.find({
      $or: [{ instructor: instructorId }, { createdBy: instructorId }],
    })
      .select("_id")
      .lean(),
    Batch.find({
      $or: [{ instructorId }, { instructorIds: instructorId }],
    })
      .select("courseId")
      .lean(),
  ]);

  const ids = new Set<string>();
  for (const course of courses) ids.add(String(course._id));
  for (const batch of batches) {
    if (batch.courseId) ids.add(String(batch.courseId));
  }
  return [...ids].map((id) => toObjectId(id));
}

export async function instructorCanAccessCourse(userId: string, courseId: string) {
  const ids = await instructorAccessibleCourseIds(userId);
  return ids.some((id) => String(id) === String(courseId));
}
