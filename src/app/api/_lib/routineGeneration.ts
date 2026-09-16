import type { IRoutineSlot } from "@/models/RoutineSlot";
import { WEEKDAY_LABELS } from "@/app/api/_lib/batchAccess";
import { addMinutesToTime } from "@/app/api/_lib/batchRoutineSync";

export type GeneratedSessionPreview = {
  key: string;
  date: string;
  dayOfWeek: number;
  dayLabel: string;
  startTime: string;
  endTime: string;
  topic: string;
  instructorId: string;
  chapterId?: string;
  /** @deprecated Use chapterId */
  batchClassId?: string;
  routineSlotId: string;
};

function parseTimeMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function durationFromSlot(startTime: string, endTime: string) {
  const diff = parseTimeMinutes(endTime) - parseTimeMinutes(startTime);
  return diff > 0 ? diff : 60;
}

export function slotDurationMinutes(slot: Pick<IRoutineSlot, "startTime" | "endTime">) {
  return durationFromSlot(slot.startTime, slot.endTime);
}

export function generateSessionPreviews(
  slots: Pick<
    IRoutineSlot,
    "_id" | "dayOfWeek" | "startTime" | "endTime" | "topic" | "instructorId" | "chapterId" | "batchClassId" | "status"
  >[],
  startDate: Date,
  endDate: Date,
): GeneratedSessionPreview[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const activeSlots = slots.filter((s) => s.status === "active");
  const previews: GeneratedSessionPreview[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const dayOfWeek = cursor.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const daySlots = activeSlots.filter((s) => s.dayOfWeek === dayOfWeek);
    for (const slot of daySlots) {
      const dateIso = cursor.toISOString().slice(0, 10);
      previews.push({
        key: `${dateIso}-${String(slot._id)}`,
        date: dateIso,
        dayOfWeek,
        dayLabel: WEEKDAY_LABELS[dayOfWeek],
        startTime: slot.startTime,
        endTime: slot.endTime,
        topic: slot.topic,
        instructorId: String(slot.instructorId),
        chapterId: slot.chapterId
          ? String(slot.chapterId)
          : slot.batchClassId
            ? String(slot.batchClassId)
            : undefined,
        batchClassId: slot.chapterId
          ? String(slot.chapterId)
          : slot.batchClassId
            ? String(slot.batchClassId)
            : undefined,
        routineSlotId: String(slot._id),
      });
    }
  }

  previews.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });

  return previews;
}

export function previewToScheduledAt(date: string, startTime: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = startTime.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export { addMinutesToTime, durationFromSlot };
