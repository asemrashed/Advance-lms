/**
 * Curriculum visibility: blank chapters (no lessons) stay hidden on public
 * and student-facing curriculum until the instructor adds lessons.
 */

export function chapterHasLessons(
  chapterId: string,
  lessonChapterIds: Iterable<string>,
): boolean {
  const id = String(chapterId || "");
  if (!id) return false;
  for (const lessonChapterId of lessonChapterIds) {
    if (String(lessonChapterId) === id) return true;
  }
  return false;
}

export function filterChaptersWithLessons<T extends { _id: unknown }>(
  chapters: T[],
  lessons: Array<{ chapter?: unknown }>,
): T[] {
  const chapterIdsWithLessons = new Set<string>();
  for (const lesson of lessons) {
    const raw = lesson.chapter;
    if (raw && typeof raw === "object") {
      const id = String((raw as { _id?: unknown })._id || "");
      if (id) chapterIdsWithLessons.add(id);
      continue;
    }
    const id = String(raw || "");
    if (id) chapterIdsWithLessons.add(id);
  }
  return chapters.filter((chapter) =>
    chapterIdsWithLessons.has(String(chapter._id)),
  );
}
