import Batch, { type IBatchScheduleSlot } from "@/models/Batch";
import RoutineSlot from "@/models/RoutineSlot";
import { toObjectId } from "@/app/api/_lib/phase12";

/** Copy legacy Batch.schedule into RoutineSlot rows when none exist yet. */
export async function ensureRoutineSlotsMigrated(batchId: string) {
  const existing = await RoutineSlot.countDocuments({ batchId: toObjectId(batchId) });
  if (existing > 0) return;

  const batch = await Batch.findById(batchId).select("schedule instructorId").lean();
  if (!batch || !Array.isArray(batch.schedule) || batch.schedule.length === 0) return;

  const fallbackInstructor = batch.instructorId || batch.instructorIds?.[0];
  if (!fallbackInstructor) return;

  const docs = (batch.schedule as IBatchScheduleSlot[]).map((slot) => ({
    batchId: toObjectId(batchId),
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    topic: slot.title || "Class",
    instructorId: fallbackInstructor,
    status: "active" as const,
  }));

  if (docs.length > 0) {
    await RoutineSlot.insertMany(docs);
  }
}
