import Batch from "@/models/Batch";
import LiveClass from "@/models/LiveClass";
import {
  countActivePaidEnrollmentsByBatchIds,
  instructorBatchFilter,
} from "@/app/api/_lib/batchAccess";
import { deriveUpcomingFromLiveClassRows } from "@/app/api/_lib/upcomingLiveClasses";
import type { StaffBatchDashboardSummary } from "@/types/dashboard";

export async function loadStaffBatchDashboardSummary(options: {
  instructorId?: string;
  batchLimit?: number;
}): Promise<StaffBatchDashboardSummary> {
  const limit = options.batchLimit ?? 12;
  const filter: Record<string, unknown> = { isActive: true };
  if (options.instructorId) {
    Object.assign(filter, instructorBatchFilter(options.instructorId));
  }

  const batches = await Batch.find(filter)
    .select("name grade shortDescription thumbnailUrl monthlyFee maxStudents")
    .sort({ startDate: -1 })
    .limit(limit)
    .lean();

  const batchIds = batches.map((b) => b._id);
  if (batchIds.length === 0) {
    return { totalBatches: 0, batches: [], upcomingClasses: [] };
  }

  const [countMap, liveClassRows, totalBatches] = await Promise.all([
    countActivePaidEnrollmentsByBatchIds(batchIds),
    LiveClass.find({
      batchId: { $in: batchIds },
      isActive: true,
    })
      .sort({ scheduledAt: 1 })
      .lean(),
    Batch.countDocuments(filter),
  ]);

  const nameMap = new Map(
    batches.map((b) => [String(b._id), String(b.name ?? "Batch")]),
  );

  const derived = deriveUpcomingFromLiveClassRows(
    liveClassRows as Parameters<typeof deriveUpcomingFromLiveClassRows>[0],
    nameMap,
    { horizonDays: 14, limit: 6 },
  );

  const nextByBatch = new Map<string, string>();
  for (const row of derived) {
    if (!nextByBatch.has(row.batchId)) {
      nextByBatch.set(row.batchId, row.scheduledAt);
    }
  }

  return {
    totalBatches,
    batches: batches.map((b) => ({
      _id: String(b._id),
      name: String(b.name ?? ""),
      grade: String(b.grade ?? "O"),
      shortDescription: String(b.shortDescription ?? ""),
      thumbnailUrl: String(b.thumbnailUrl ?? ""),
      fee: Number(b.monthlyFee) || 0,
      maxStudents: Number(b.maxStudents) || 0,
      enrolledCount: countMap.get(String(b._id)) ?? 0,
      nextClassAt: nextByBatch.get(String(b._id)),
    })),
    upcomingClasses: derived.map((row) => ({
      _id: row._id,
      batchId: row.batchId,
      batchName: row.batchName,
      title: row.title,
      scheduledAt: row.scheduledAt,
      type: row.type,
    })),
  };
}
