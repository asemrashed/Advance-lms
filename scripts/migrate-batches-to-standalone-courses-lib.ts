import mongoose from "mongoose";
import Batch from "@/models/Batch";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import { promoteCurriculumToCourseLevel } from "./migrate-curriculum-to-course-level-lib";

export type SplitBatchesToCoursesStats = {
  parentCoursesProcessed: number;
  coursesCreated: number;
  batchesReparented: number;
  sectionBatchesCreated: number;
  chaptersCopied: number;
  lessonsCopied: number;
  parentsArchived: number;
};

const SECTION_SUFFIXES = ["Morning Section", "Evening Section"] as const;

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

async function copyCurriculumToCourse(
  sourceCourseId: mongoose.Types.ObjectId,
  targetCourseId: mongoose.Types.ObjectId,
  dryRun: boolean,
): Promise<{ chapters: number; lessons: number }> {
  const sourceChapters = await Chapter.find({
    course: sourceCourseId,
    batchId: { $exists: false },
  })
    .sort({ order: 1 })
    .lean();

  let chaptersCopied = 0;
  let lessonsCopied = 0;

  for (const chapter of sourceChapters) {
    chaptersCopied += 1;
    if (dryRun) {
      lessonsCopied += await Lesson.countDocuments({ chapter: chapter._id });
      continue;
    }

    const newChapter = await Chapter.create({
      course: targetCourseId,
      title: chapter.title,
      description: chapter.description,
      order: chapter.order,
      isPublished: chapter.isPublished,
      instructorId: chapter.instructorId,
      subjectLabel: chapter.subjectLabel,
    });

    const lessons = await Lesson.find({ chapter: chapter._id }).lean();
    if (lessons.length > 0) {
      await Lesson.insertMany(
        lessons.map((lesson) => ({
          course: targetCourseId,
          chapter: newChapter._id,
          title: lesson.title,
          description: lesson.description,
          order: lesson.order,
          lessonType: lesson.lessonType,
          content: lesson.content,
          videoUrl: lesson.videoUrl,
          pdfUrl: lesson.pdfUrl,
          duration: lesson.duration,
          isFree: lesson.isFree,
          isPublished: lesson.isPublished,
          instructorId: lesson.instructorId,
        })),
      );
      lessonsCopied += lessons.length;
    }
  }

  return { chapters: chaptersCopied, lessons: lessonsCopied };
}

/**
 * Split multi-batch live courses so each existing batch becomes its own live
 * course, then add 2 section batches (morning/evening) per new course.
 */
export async function splitBatchesToStandaloneCourses(options?: {
  dryRun?: boolean;
  sectionsPerCourse?: number;
}): Promise<SplitBatchesToCoursesStats> {
  const dryRun = options?.dryRun ?? false;
  const sectionsPerCourse = options?.sectionsPerCourse ?? 2;

  const stats: SplitBatchesToCoursesStats = {
    parentCoursesProcessed: 0,
    coursesCreated: 0,
    batchesReparented: 0,
    sectionBatchesCreated: 0,
    chaptersCopied: 0,
    lessonsCopied: 0,
    parentsArchived: 0,
  };

  // Ensure shared curriculum at course level before splitting.
  await promoteCurriculumToCourseLevel({ dryRun });

  const parentCourses = await Course.find({
    courseType: "live",
    status: { $ne: "archived" },
  }).lean();

  for (const parent of parentCourses) {
    const batches = await Batch.find({ courseId: parent._id })
      .sort({ createdAt: 1 })
      .lean();

    if (batches.length === 0) continue;
    stats.parentCoursesProcessed += 1;

    // Only split when multiple batches exist under one course.
    if (batches.length < 2) continue;

    for (const batch of batches) {
      const courseTitle =
        String(batch.name).trim() || `${parent.title} — Section`;

      if (dryRun) {
        stats.coursesCreated += 1;
        stats.batchesReparented += 1;
        stats.sectionBatchesCreated += sectionsPerCourse;
        const chapterCount = await Chapter.countDocuments({
          course: parent._id,
          batchId: { $exists: false },
        });
        stats.chaptersCopied += chapterCount;
        continue;
      }

      const newCourse = await Course.create({
        courseType: "live",
        title: courseTitle,
        shortDescription: batch.shortDescription || parent.shortDescription,
        description: batch.description || parent.description,
        subjectId: parent.subjectId,
        subjectCode: parent.subjectCode,
        subjectName: parent.subjectName,
        grade: batch.grade || parent.grade,
        thumbnailUrl: batch.thumbnailUrl || parent.thumbnailUrl,
        isPaid: Boolean(parent.isPaid),
        price: parent.price,
        salePrice: parent.salePrice,
        status: parent.status,
        instructor: parent.instructor,
        createdBy: parent.createdBy,
      });

      await Batch.updateOne(
        { _id: batch._id },
        { $set: { courseId: newCourse._id, fee: 0, name: "Section A" } },
      );
      stats.batchesReparented += 1;

      const copied = await copyCurriculumToCourse(
        parent._id as mongoose.Types.ObjectId,
        newCourse._id,
        dryRun,
      );
      stats.chaptersCopied += copied.chapters;
      stats.lessonsCopied += copied.lessons;

      const baseStart = new Date(batch.startDate);
      const baseEnd = new Date(batch.endDate);

      for (let i = 0; i < sectionsPerCourse; i++) {
        const suffix = SECTION_SUFFIXES[i] ?? `Section ${i + 2}`;
        await Batch.create({
          courseId: newCourse._id,
          name: suffix,
          subject: batch.subject || parent.subjectName || "",
          instructorId: batch.instructorId,
          instructorIds: batch.instructorIds ?? [],
          grade: batch.grade,
          startDate: addMonths(baseStart, i),
          endDate: addMonths(baseEnd, i),
          maxStudents: batch.maxStudents,
          fee: 0,
          isActive: true,
          shortDescription: `Alternate schedule — ${suffix}`,
          description: batch.description,
          features: batch.features ?? [],
        });
        stats.sectionBatchesCreated += 1;
      }

      stats.coursesCreated += 1;
    }

    if (!dryRun) {
      await Course.updateOne(
        { _id: parent._id },
        { $set: { status: "archived", isHidden: true } },
      );
    }
    stats.parentsArchived += 1;
  }

  return stats;
}
