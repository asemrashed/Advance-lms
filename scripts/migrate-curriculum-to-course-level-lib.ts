import Batch from "@/models/Batch";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";

/**
 * Promote per-batch live-course curriculum to the shared course level.
 *
 * For each live course we walk its batch-scoped chapters (oldest order first):
 *   - The first chapter seen for a given title is PROMOTED to course level
 *     (its `batchId` is stripped, and the same is done for its lessons).
 *   - Any later sibling chapter with the same title is treated as a duplicate
 *     and DISCARDED (chapter + its lessons deleted), since all sections now
 *     share one curriculum.
 *
 * De-dup rule: chapters are matched case-insensitively by trimmed title. This
 * keeps the union of distinct chapters across siblings so nothing unique is
 * lost, while collapsing identical copies. Run with `dryRun` first to review.
 *
 * Caveat: discarded duplicate chapters/lessons may still be referenced by
 * quizzes, resources, or platform questions. Review the dry-run output and
 * confirm the de-dup strategy before running against production data.
 */
export type PromoteCurriculumStats = {
  liveCoursesProcessed: number;
  chaptersPromoted: number;
  chaptersDiscarded: number;
  lessonsPromoted: number;
  lessonsDiscarded: number;
};

function normalizeTitle(title: unknown): string {
  return String(title ?? "")
    .trim()
    .toLowerCase();
}

export async function promoteCurriculumToCourseLevel(options?: {
  dryRun?: boolean;
}): Promise<PromoteCurriculumStats> {
  const dryRun = options?.dryRun ?? false;
  const stats: PromoteCurriculumStats = {
    liveCoursesProcessed: 0,
    chaptersPromoted: 0,
    chaptersDiscarded: 0,
    lessonsPromoted: 0,
    lessonsDiscarded: 0,
  };

  const liveCourses = await Course.find({ courseType: "live" })
    .select("_id")
    .lean();

  for (const course of liveCourses) {
    stats.liveCoursesProcessed += 1;

    // Skip courses without any batches (nothing batch-scoped to promote).
    const batchCount = await Batch.countDocuments({ courseId: course._id });
    if (batchCount === 0) continue;

    // Existing course-level chapters seed the de-dup map and max order.
    const courseLevel = await Chapter.find({
      course: course._id,
      batchId: { $exists: false },
    })
      .select("_id title order")
      .lean();

    const seenTitles = new Map<string, boolean>();
    let maxOrder = 0;
    for (const ch of courseLevel) {
      seenTitles.set(normalizeTitle(ch.title), true);
      if (typeof ch.order === "number" && ch.order > maxOrder) {
        maxOrder = ch.order;
      }
    }

    // Batch-scoped chapters, processed in a stable order.
    const batchChapters = await Chapter.find({
      course: course._id,
      batchId: { $exists: true },
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    for (const chapter of batchChapters) {
      const key = normalizeTitle(chapter.title);

      if (seenTitles.has(key)) {
        // Duplicate of a chapter already at course level — discard.
        const lessonCount = await Lesson.countDocuments({
          chapter: chapter._id,
        });
        if (!dryRun) {
          await Lesson.deleteMany({ chapter: chapter._id });
          await Chapter.deleteOne({ _id: chapter._id });
        }
        stats.chaptersDiscarded += 1;
        stats.lessonsDiscarded += lessonCount;
        continue;
      }

      // First occurrence — promote to course level.
      maxOrder += 1;
      if (!dryRun) {
        await Chapter.updateOne(
          { _id: chapter._id },
          { $unset: { batchId: "" }, $set: { order: maxOrder } },
        );
        const res = await Lesson.updateMany(
          { chapter: chapter._id },
          { $unset: { batchId: "" } },
        );
        stats.lessonsPromoted += res.modifiedCount ?? 0;
      } else {
        stats.lessonsPromoted += await Lesson.countDocuments({
          chapter: chapter._id,
        });
      }
      seenTitles.set(key, true);
      stats.chaptersPromoted += 1;
    }
  }

  return stats;
}
