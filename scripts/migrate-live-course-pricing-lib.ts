import Batch from "@/models/Batch";
import Course from "@/models/Course";
import { resolveLiveCoursePrice } from "@/lib/courses/liveCoursePricing";

export type MigrateLiveCoursePricingStats = {
  liveCoursesProcessed: number;
  coursesPriced: number;
  batchesFeeCleared: number;
};

/**
 * Move batch-level fees to the parent live course.
 * Uses the highest batch fee when course has no price yet.
 */
export async function migrateLiveCoursePricing(options?: {
  dryRun?: boolean;
}): Promise<MigrateLiveCoursePricingStats> {
  const dryRun = options?.dryRun ?? false;
  const stats: MigrateLiveCoursePricingStats = {
    liveCoursesProcessed: 0,
    coursesPriced: 0,
    batchesFeeCleared: 0,
  };

  const liveCourses = await Course.find({ courseType: "live" }).lean();

  for (const course of liveCourses) {
    stats.liveCoursesProcessed += 1;

    const batches = await Batch.find({ courseId: course._id }).lean();
    if (batches.length === 0) continue;

    const maxBatchFee = Math.max(
      ...batches.map((b) => {
        const legacy = b as { fee?: number; monthlyFee?: number };
        return Number(legacy.fee ?? legacy.monthlyFee) || 0;
      }),
    );
    const currentPrice = resolveLiveCoursePrice({
      isPaid: Boolean(course.isPaid),
      price: Number(course.price) || 0,
      salePrice: Number(course.salePrice) || 0,
    });

    const needsPricing =
      currentPrice <= 0 && maxBatchFee > 0 && !course.isPaid;

    if (needsPricing) {
      if (!dryRun) {
        await Course.updateOne(
          { _id: course._id },
          { $set: { isPaid: true, price: maxBatchFee } },
        );
      }
      stats.coursesPriced += 1;
    }

    const batchesWithFee = batches.filter((b) => {
      const legacy = b as { fee?: number };
      return Number(legacy.fee) > 0;
    });
    if (batchesWithFee.length > 0) {
      if (!dryRun) {
        await Batch.updateMany(
          { _id: { $in: batchesWithFee.map((b) => b._id) } },
          { $set: { fee: 0 } },
        );
      }
      stats.batchesFeeCleared += batchesWithFee.length;
    }
  }

  return stats;
}
