import { getDisplayName } from "@/lib/displayName";
export function mapRoutineSlot(row: Record<string, unknown>) {
  const instructor = row.instructorId as Record<string, unknown> | null;
  const chapter = row.chapterId as Record<string, unknown> | null;
  const instructorPopulated =
    instructor && typeof instructor === "object" && "_id" in instructor;
  const chapterPopulated =
    chapter && typeof chapter === "object" && "_id" in chapter;

  const chapterTitle = chapterPopulated
    ? String(chapter.title ?? "")
    : undefined;
  const subjectLabel = chapterPopulated
    ? String(chapter.subjectLabel ?? "")
    : undefined;

  return {
    _id: String(row._id),
    batchId: String(row.batchId),
    chapterId: chapterPopulated
      ? String(chapter._id)
      : row.chapterId
        ? String(row.chapterId)
        : undefined,
    chapterTitle,
    /** @deprecated Use chapterTitle */
    batchClassId: chapterPopulated
      ? String(chapter._id)
      : row.chapterId
        ? String(row.chapterId)
        : undefined,
    /** @deprecated Use chapterTitle */
    batchClassTitle: chapterTitle || subjectLabel || undefined,
    dayOfWeek: Number(row.dayOfWeek),
    startTime: String(row.startTime ?? ""),
    endTime: String(row.endTime ?? ""),
    topic: String(row.topic ?? ""),
    instructorId: instructorPopulated
      ? String(instructor._id)
      : String(row.instructorId ?? ""),
    instructorName: instructorPopulated
      ? String(
          getDisplayName(instructor) ||
            instructor.email ||
            "Instructor",
        )
      : undefined,
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: (row.createdAt as Date)?.toISOString?.() ?? row.createdAt,
    updatedAt: (row.updatedAt as Date)?.toISOString?.() ?? row.updatedAt,
  };
}
