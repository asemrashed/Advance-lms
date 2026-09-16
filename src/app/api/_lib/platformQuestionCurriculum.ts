import Chapter from "@/models/Chapter";
import Lesson from "@/models/Lesson";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import { instructorBatchFilter } from "@/app/api/_lib/batchAccess";
import type { SessionUser } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";

export type CurriculumModuleOption = {
  _id: string;
  title: string;
  batchId: string;
  /** @deprecated Use _id (chapter) */
  batchClassId: string;
  lessons: { _id: string; title: string }[];
};

export async function getCurriculumOptionsForSubject(
  user: SessionUser,
  subjectTitle: string,
): Promise<CurriculumModuleOption[]> {
  const title = subjectTitle.trim();
  if (!title) return [];

  const batchFilter: Record<string, unknown> = { isActive: { $ne: false } };
  if (user.role === "instructor") {
    Object.assign(batchFilter, instructorBatchFilter(user.id));
  } else if (!isAdminAreaRole(user.role)) {
    return [];
  }

  const batches = await Batch.find(batchFilter).select("_id").lean();
  const batchIds = batches.map((b) => b._id);
  if (!batchIds.length) return [];

  const chapters = await Chapter.find({
    batchId: { $in: batchIds },
    $or: [{ subjectLabel: title }, { title }],
  })
    .sort({ order: 1, title: 1 })
    .select("_id title batchId subjectLabel")
    .lean();

  if (!chapters.length) return [];

  const chapterIds = chapters.map((c) => c._id);
  const lessons = await Lesson.find({ chapter: { $in: chapterIds } })
    .sort({ order: 1, title: 1 })
    .select("_id title chapter")
    .lean();

  const lessonsByChapter = new Map<string, { _id: string; title: string }[]>();
  for (const lesson of lessons) {
    const key = String(lesson.chapter);
    const list = lessonsByChapter.get(key) ?? [];
    list.push({ _id: String(lesson._id), title: String(lesson.title) });
    lessonsByChapter.set(key, list);
  }

  return chapters.map((ch) => ({
    _id: String(ch._id),
    title: String(ch.title),
    batchId: String(ch.batchId),
    batchClassId: String(ch._id),
    lessons: lessonsByChapter.get(String(ch._id)) ?? [],
  }));
}

export async function listBatchChapterOptions(batchId: string) {
  const chapters = await Chapter.find({ batchId })
    .sort({ order: 1 })
    .select("_id title subjectLabel")
    .lean();
  return chapters.map((ch) => ({
    _id: String(ch._id),
    label: String(ch.subjectLabel ? `${ch.subjectLabel} · ${ch.title}` : ch.title),
  }));
}

export async function listChapterLessonOptions(chapterId: string) {
  const lessons = await Lesson.find({ chapter: chapterId })
    .sort({ order: 1 })
    .select("_id title")
    .lean();
  return lessons.map((l) => ({ _id: String(l._id), label: String(l.title) }));
}

export async function resolveCourseIdForBatch(batchId: string) {
  const batch = await Batch.findById(batchId).select("courseId").lean();
  return batch?.courseId ? String(batch.courseId) : null;
}

export async function listCourseChapterOptions(courseId: string, batchId?: string) {
  const filter: Record<string, unknown> = { course: courseId };
  if (batchId) filter.batchId = batchId;
  const chapters = await Chapter.find(filter)
    .sort({ order: 1 })
    .select("_id title")
    .lean();
  return chapters.map((ch) => ({ _id: String(ch._id), label: String(ch.title) }));
}

export async function courseExists(courseId: string) {
  const row = await Course.findById(courseId).select("_id").lean();
  return Boolean(row);
}
