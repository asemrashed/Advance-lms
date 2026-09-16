import mongoose from "mongoose";
import Batch from "@/models/Batch";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import {
  assertBatchIdForLiveChapter,
  isLiveCourseType,
  lessonTypeAllowedForCourse,
  normalizeCourseType,
  normalizeLessonType,
} from "@/lib/courses/unifiedCourse";
import type {
  CurriculumChapterSuggestion,
  CurriculumSuggestionsResponse,
  CourseType,
} from "@/types/unifiedCourse";

export function mapCourseTypeField(
  course: { courseType?: unknown },
): CourseType {
  return normalizeCourseType(course.courseType);
}

export async function loadCourseOrThrow(courseId: string) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error("invalid_course_id");
  }
  const course = await Course.findById(courseId).lean();
  if (!course) {
    throw new Error("course_not_found");
  }
  return {
    ...course,
    courseType: mapCourseTypeField(course),
  };
}

export async function assertBatchBelongsToCourse(
  batchId: string,
  courseId: string,
) {
  if (!mongoose.Types.ObjectId.isValid(batchId)) {
    throw new Error("invalid_batch_id");
  }
  const batch = await Batch.findById(batchId).select("_id courseId").lean();
  if (!batch) {
    throw new Error("batch_not_found");
  }
  if (batch.courseId && String(batch.courseId) !== courseId) {
    throw new Error("batch_course_mismatch");
  }
  return batch;
}

export async function buildCurriculumSuggestions(
  sourceBatchId: string,
  targetBatchId: string,
): Promise<CurriculumSuggestionsResponse> {
  const [sourceBatch, targetBatch] = await Promise.all([
    Batch.findById(sourceBatchId).select("_id courseId").lean(),
    Batch.findById(targetBatchId).select("_id courseId").lean(),
  ]);

  if (!sourceBatch || !targetBatch) {
    throw new Error("batch_not_found");
  }

  const sourceCourseId = sourceBatch.courseId
    ? String(sourceBatch.courseId)
    : null;
  const targetCourseId = targetBatch.courseId
    ? String(targetBatch.courseId)
    : null;

  if (
    !sourceCourseId ||
    !targetCourseId ||
    sourceCourseId !== targetCourseId
  ) {
    throw new Error("batch_course_mismatch");
  }

  const chapters = await Chapter.find({
    course: sourceCourseId,
    batchId: sourceBatchId,
  })
    .sort({ order: 1 })
    .lean();

  const chapterIds = chapters.map((c) => c._id);
  const lessons = chapterIds.length
    ? await Lesson.find({ chapter: { $in: chapterIds } })
        .sort({ order: 1 })
        .lean()
    : [];

  const lessonsByChapter = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const key = String(lesson.chapter);
    const bucket = lessonsByChapter.get(key) ?? [];
    bucket.push(lesson);
    lessonsByChapter.set(key, bucket);
  }

  const suggestions: CurriculumChapterSuggestion[] = chapters.map((chapter) => ({
    title: chapter.title,
    order: chapter.order,
    description: chapter.description || undefined,
    lessons: (lessonsByChapter.get(String(chapter._id)) ?? []).map(
      (lesson) => ({
        title: lesson.title,
        order: lesson.order,
        lessonType: normalizeLessonType(lesson.lessonType),
      }),
    ),
  }));

  return {
    sourceBatchId,
    targetBatchId,
    chapters: suggestions,
  };
}

export async function copyCurriculumStructure(
  sourceBatchId: string,
  targetBatchId: string,
) {
  const suggestions = await buildCurriculumSuggestions(
    sourceBatchId,
    targetBatchId,
  );

  const targetBatch = await Batch.findById(targetBatchId)
    .select("_id courseId")
    .lean();
  if (!targetBatch?.courseId) {
    throw new Error("batch_course_missing");
  }

  const courseId = String(targetBatch.courseId);
  const createdChapters: { _id: string; title: string; order: number }[] = [];
  let lessonCount = 0;

  for (const chapterSuggestion of suggestions.chapters) {
    const chapter = await Chapter.create({
      title: chapterSuggestion.title,
      description: chapterSuggestion.description,
      course: courseId,
      batchId: targetBatchId,
      order: chapterSuggestion.order,
      isPublished: false,
    });

    createdChapters.push({
      _id: String(chapter._id),
      title: chapter.title,
      order: chapter.order,
    });

    for (const lessonSuggestion of chapterSuggestion.lessons) {
      await Lesson.create({
        title: lessonSuggestion.title,
        lessonType: lessonSuggestion.lessonType,
        chapter: chapter._id,
        course: courseId,
        batchId: targetBatchId,
        order: lessonSuggestion.order,
        isPublished: false,
        isFree: false,
      });
      lessonCount += 1;
    }
  }

  return {
    targetBatchId,
    chaptersCreated: createdChapters.length,
    lessonsCreated: lessonCount,
    chapters: createdChapters,
  };
}

/**
 * Build course-level curriculum suggestions from a source course.
 * Reads course-level chapters/lessons (shared curriculum, no batchId).
 */
export async function buildCourseCurriculumSuggestions(
  sourceCourseId: string,
): Promise<CurriculumChapterSuggestion[]> {
  if (!mongoose.Types.ObjectId.isValid(sourceCourseId)) {
    throw new Error("invalid_course_id");
  }

  const chapters = await Chapter.find({
    course: sourceCourseId,
    batchId: { $exists: false },
  })
    .sort({ order: 1 })
    .lean();

  const chapterIds = chapters.map((c) => c._id);
  const lessons = chapterIds.length
    ? await Lesson.find({ chapter: { $in: chapterIds } })
        .sort({ order: 1 })
        .lean()
    : [];

  const lessonsByChapter = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const key = String(lesson.chapter);
    const bucket = lessonsByChapter.get(key) ?? [];
    bucket.push(lesson);
    lessonsByChapter.set(key, bucket);
  }

  return chapters.map((chapter) => ({
    title: chapter.title,
    order: chapter.order,
    description: chapter.description || undefined,
    chapterId: String(chapter._id),
    lessons: (lessonsByChapter.get(String(chapter._id)) ?? []).map(
      (lesson) => ({
        title: lesson.title,
        order: lesson.order,
        lessonType: normalizeLessonType(lesson.lessonType),
        lessonId: String(lesson._id),
      }),
    ),
  }));
}

/**
 * Copy curriculum (chapter + lesson structure) from one course into another at
 * the course level. Optionally restrict to a subset of source chapters/lessons.
 */
export async function copyCourseCurriculum(
  sourceCourseId: string,
  targetCourseId: string,
  options?: { chapterIds?: string[]; lessonIds?: string[] },
) {
  if (
    !mongoose.Types.ObjectId.isValid(sourceCourseId) ||
    !mongoose.Types.ObjectId.isValid(targetCourseId)
  ) {
    throw new Error("invalid_course_id");
  }
  if (sourceCourseId === targetCourseId) {
    throw new Error("same_course");
  }

  const targetCourse = await Course.findById(targetCourseId)
    .select("_id")
    .lean();
  if (!targetCourse) {
    throw new Error("course_not_found");
  }

  const suggestions = await buildCourseCurriculumSuggestions(sourceCourseId);

  const chapterFilter = options?.chapterIds?.length
    ? new Set(options.chapterIds)
    : null;
  const lessonFilter = options?.lessonIds?.length
    ? new Set(options.lessonIds)
    : null;

  const selectedChapters = chapterFilter
    ? suggestions.filter((c) => c.chapterId && chapterFilter.has(c.chapterId))
    : suggestions;

  const existingCount = await Chapter.countDocuments({
    course: targetCourseId,
    batchId: { $exists: false },
  });

  const createdChapters: { _id: string; title: string; order: number }[] = [];
  let lessonCount = 0;
  let order = existingCount;

  for (const chapterSuggestion of selectedChapters) {
    order += 1;
    const chapter = await Chapter.create({
      title: chapterSuggestion.title,
      description: chapterSuggestion.description,
      course: targetCourseId,
      order,
      isPublished: false,
    });

    createdChapters.push({
      _id: String(chapter._id),
      title: chapter.title,
      order: chapter.order,
    });

    const lessonsToCopy = lessonFilter
      ? chapterSuggestion.lessons.filter(
          (l) => l.lessonId && lessonFilter.has(l.lessonId),
        )
      : chapterSuggestion.lessons;

    let lessonOrder = 0;
    for (const lessonSuggestion of lessonsToCopy) {
      lessonOrder += 1;
      await Lesson.create({
        title: lessonSuggestion.title,
        lessonType: lessonSuggestion.lessonType,
        chapter: chapter._id,
        course: targetCourseId,
        order: lessonOrder,
        isPublished: false,
        isFree: false,
      });
      lessonCount += 1;
    }
  }

  return {
    sourceCourseId,
    targetCourseId,
    chaptersCreated: createdChapters.length,
    lessonsCreated: lessonCount,
    chapters: createdChapters,
  };
}

export function validateChapterCreateInput(options: {
  courseType: CourseType;
  batchId?: string;
}) {
  return assertBatchIdForLiveChapter(options.courseType, options.batchId);
}

export function validateLessonCreateInput(options: {
  courseType: CourseType;
  lessonType: ReturnType<typeof normalizeLessonType>;
  batchId?: string;
  chapterBatchId?: string;
}) {
  if (!lessonTypeAllowedForCourse(options.courseType, options.lessonType)) {
    return "live lesson type is only allowed on live courses";
  }
  // Live-course curriculum is shared at the course level; batchId is optional.
  // When a batchId is supplied it must still match the parent chapter's batchId.
  if (isLiveCourseType(options.courseType)) {
    if (
      options.batchId &&
      options.chapterBatchId &&
      options.chapterBatchId !== options.batchId
    ) {
      return "lesson batchId must match chapter batchId";
    }
  } else if (options.batchId) {
    return "Recorded courses cannot scope lessons to a batch";
  }
  return null;
}

export function liveCoursePricingError(courseType: CourseType): string | null {
  if (isLiveCourseType(courseType)) {
    return "Live courses do not support direct course enrollment; select a batch to enroll";
  }
  return null;
}
