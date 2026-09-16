import mongoose from "mongoose";
import Batch from "@/models/Batch";
import {
  LegacyBatchClass as BatchClass,
  LegacySubjectModule as SubjectModule,
  LegacySubjectLesson as SubjectLesson,
} from "./legacy/models";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import LiveClass from "@/models/LiveClass";
import PlatformQuestion from "@/models/PlatformQuestion";
import ResourceNote from "@/models/ResourceNote";
import ResourceWorksheet from "@/models/ResourceWorksheet";
import RoutineSlot from "@/models/RoutineSlot";
import { toObjectId } from "@/app/api/_lib/phase12";

export type MigrationStats = {
  batchesLinked: number;
  chaptersCreated: number;
  lessonsCreated: number;
  routineSlotsUpdated: number;
  liveClassesUpdated: number;
  platformQuestionsUpdated: number;
  resourceNotesUpdated: number;
  resourceWorksheetsUpdated: number;
  legacySubjectsRemoved: number;
  legacyModulesRemoved: number;
  legacyLessonsRemoved: number;
};

function mapSubjectLessonType(type: string): "recorded" | "live" | "pdf" | "text" {
  if (type === "live") return "live";
  return "recorded";
}

export async function migrateBatchCurriculum(options?: {
  dryRun?: boolean;
}): Promise<MigrationStats> {
  const dryRun = options?.dryRun ?? false;
  const stats: MigrationStats = {
    batchesLinked: 0,
    chaptersCreated: 0,
    lessonsCreated: 0,
    routineSlotsUpdated: 0,
    liveClassesUpdated: 0,
    platformQuestionsUpdated: 0,
    resourceNotesUpdated: 0,
    resourceWorksheetsUpdated: 0,
    legacySubjectsRemoved: 0,
    legacyModulesRemoved: 0,
    legacyLessonsRemoved: 0,
  };

  const moduleToChapter = new Map<string, string>();
  const lessonToLesson = new Map<string, string>();
  const batchClassToChapter = new Map<string, string>();

  const batches = await Batch.find({}).lean();
  for (const batch of batches) {
    let courseId = batch.courseId ? String(batch.courseId) : "";

    if (!courseId) {
      if (dryRun) {
        stats.batchesLinked += 1;
        courseId = "dry-run-course";
      } else {
        const course = await Course.create({
          courseType: "live",
          title: String(batch.name || batch.subject || "Live course"),
          shortDescription: batch.shortDescription || "",
          description: batch.description || "",
          thumbnailUrl: batch.thumbnailUrl || "",
          isPaid: Number(batch.monthlyFee) > 0,
          price: Number(batch.monthlyFee) || 0,
          status: "published",
          isHidden: false,
        });
        courseId = String(course._id);
        await Batch.updateOne({ _id: batch._id }, { $set: { courseId: course._id } });
        stats.batchesLinked += 1;
      }
    }

    if (dryRun && courseId === "dry-run-course") {
      continue;
    }

    const batchClasses = await BatchClass.find({
      batchId: batch._id,
      isActive: { $ne: false },
    })
      .sort({ sortOrder: 1 })
      .lean();

    const multiSubject = batchClasses.length > 1;

    for (const batchClass of batchClasses) {
      const modules = await SubjectModule.find({ subjectId: batchClass._id })
        .sort({ order: 1 })
        .lean();

      for (const mod of modules) {
        const chapterTitle = multiSubject
          ? `${String(batchClass.title)} — ${String(mod.title)}`
          : String(mod.title);

        let chapter = await Chapter.findOne({
          batchId: batch._id,
          course: toObjectId(courseId),
          title: chapterTitle,
          order: mod.order,
        }).lean();

        if (!chapter) {
          if (dryRun) {
            stats.chaptersCreated += 1;
            moduleToChapter.set(String(mod._id), `dry-chapter-${mod._id}`);
          } else {
            const created = await Chapter.create({
              title: chapterTitle,
              description: mod.description || "",
              course: toObjectId(courseId),
              batchId: batch._id,
              instructorId: batchClass.instructorId,
              subjectLabel: String(batchClass.title),
              order: mod.order,
              isPublished: mod.isPublished !== false,
            });
            moduleToChapter.set(String(mod._id), String(created._id));
            batchClassToChapter.set(String(batchClass._id), String(created._id));
            stats.chaptersCreated += 1;
            chapter = created.toObject();
          }
        } else {
          moduleToChapter.set(String(mod._id), String(chapter._id));
          batchClassToChapter.set(String(batchClass._id), String(chapter._id));
          if (!dryRun) {
            await Chapter.updateOne(
              { _id: chapter._id },
              {
                $set: {
                  instructorId: batchClass.instructorId,
                  subjectLabel: String(batchClass.title),
                  batchId: batch._id,
                },
              },
            );
          }
        }

        const chapterId = moduleToChapter.get(String(mod._id))!;
        const subjectLessons = await SubjectLesson.find({ moduleId: mod._id })
          .sort({ order: 1 })
          .lean();

        for (const sl of subjectLessons) {
          const existing = dryRun
            ? null
            : await Lesson.findOne({
                chapter: toObjectId(chapterId),
                order: sl.order,
                title: sl.title,
              }).lean();

          if (existing) {
            lessonToLesson.set(String(sl._id), String(existing._id));
            continue;
          }

          if (dryRun) {
            stats.lessonsCreated += 1;
            lessonToLesson.set(String(sl._id), `dry-lesson-${sl._id}`);
            continue;
          }

          const createdLesson = await Lesson.create({
            title: sl.title,
            description: sl.description || "",
            lessonType: mapSubjectLessonType(String(sl.type)),
            chapter: toObjectId(chapterId),
            course: toObjectId(courseId),
            batchId: batch._id,
            liveClassId: sl.liveClassId,
            order: sl.order,
            duration: sl.durationMinutes,
            youtubeVideoId: sl.youtubeVideoId || undefined,
            videoUrl: sl.videoUrl || sl.recordingUrl || undefined,
            isPublished: sl.isPublished !== false,
            isFree: false,
          });
          lessonToLesson.set(String(sl._id), String(createdLesson._id));
          stats.lessonsCreated += 1;
        }
      }
    }
  }

  if (dryRun) return stats;

  for (const [moduleId, chapterId] of moduleToChapter) {
    if (chapterId.startsWith("dry-")) continue;

    const pq = await PlatformQuestion.updateMany(
      { subjectModuleId: toObjectId(moduleId) },
      {
        $set: { chapterId: toObjectId(chapterId) },
        $unset: { subjectModuleId: "", batchClassId: "" },
      },
    );
    stats.platformQuestionsUpdated += pq.modifiedCount;

    const rn = await ResourceNote.updateMany(
      { subjectModuleId: toObjectId(moduleId) },
      {
        $set: { chapterId: toObjectId(chapterId) },
        $unset: { subjectModuleId: "", batchClassId: "" },
      },
    );
    stats.resourceNotesUpdated += rn.modifiedCount;

    const rw = await ResourceWorksheet.updateMany(
      { subjectModuleId: toObjectId(moduleId) },
      {
        $set: { chapterId: toObjectId(chapterId) },
        $unset: { subjectModuleId: "", batchClassId: "" },
      },
    );
    stats.resourceWorksheetsUpdated += rw.modifiedCount;
  }

  for (const [legacyLessonId, unifiedLessonId] of lessonToLesson) {
    if (unifiedLessonId.startsWith("dry-")) continue;

    await PlatformQuestion.updateMany(
      { subjectLessonId: toObjectId(legacyLessonId) },
      {
        $set: { lessonId: toObjectId(unifiedLessonId) },
        $unset: { subjectLessonId: "" },
      },
    );

    await ResourceNote.updateMany(
      { subjectLessonId: toObjectId(legacyLessonId) },
      {
        $set: { lessonId: toObjectId(unifiedLessonId) },
        $unset: { subjectLessonId: "" },
      },
    );

    await ResourceWorksheet.updateMany(
      { subjectLessonId: toObjectId(legacyLessonId) },
      {
        $set: { lessonId: toObjectId(unifiedLessonId) },
        $unset: { subjectLessonId: "" },
      },
    );
  }

  for (const [batchClassId, chapterId] of batchClassToChapter) {
    const rs = await RoutineSlot.updateMany(
      { batchClassId: toObjectId(batchClassId) },
      { $set: { chapterId: toObjectId(chapterId) }, $unset: { batchClassId: "" } },
    );
    stats.routineSlotsUpdated += rs.modifiedCount;

    const lc = await LiveClass.updateMany(
      { batchClassId: toObjectId(batchClassId) },
      { $set: { chapterId: toObjectId(chapterId) }, $unset: { batchClassId: "" } },
    );
    stats.liveClassesUpdated += lc.modifiedCount;
  }

  const slDel = await SubjectLesson.deleteMany({});
  stats.legacyLessonsRemoved = slDel.deletedCount ?? 0;
  const smDel = await SubjectModule.deleteMany({});
  stats.legacyModulesRemoved = smDel.deletedCount ?? 0;
  const bcDel = await BatchClass.deleteMany({});
  stats.legacySubjectsRemoved = bcDel.deletedCount ?? 0;

  return stats;
}
