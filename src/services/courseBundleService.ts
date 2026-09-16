import {
  getPublicCourseById,
  getPublicChapters,
  getPublicFaqs,
  getPublicLessons,
} from "@/lib/api/client";

/**
 * Mirrors learning-project `CourseDetailsClient` parallel fetches — all via api client.
 */
export async function fetchCourseBundle(courseId: string) {
  const [courseRes, chRes, lRes, fRes] = await Promise.all([
    getPublicCourseById(courseId),
    // Chapters marked published; lesson outline includes instructor-added lessons
    // even before an explicit lesson publish flag (live curriculum builder).
    getPublicChapters(courseId, { isPublished: true, limit: 100 }),
    getPublicLessons(courseId, { limit: 1000 }),
    getPublicFaqs(courseId),
  ]);

  return {
    course: courseRes.data,
    chapters: chRes.data.chapters,
    lessons: lRes.data.lessons,
    faqs: fRes.data.faqs,
  };
}
