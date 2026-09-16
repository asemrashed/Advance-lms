import mongoose from "mongoose";
import Batch, { type IBatchScheduleSlot } from "@/models/Batch";
import type { ILiveClass } from "@/models/LiveClass";

export type ClassRecurrence = "once" | "weekly" | "monthly";

function padTime(n: number) {
  return String(n).padStart(2, "0");
}

export function formatTimeFromDate(date: Date): string {
  return `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
}

export function addMinutesToTime(startTime: string, minutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${padTime(nh)}:${padTime(nm)}`;
}

export function buildScheduleSlotFromLiveClass(
  liveClass: Pick<ILiveClass, "_id" | "title" | "scheduledAt" | "durationMinutes">,
  recurrence: ClassRecurrence,
): IBatchScheduleSlot | null {
  if (recurrence === "once") return null;

  const start = new Date(liveClass.scheduledAt);
  const startTime = formatTimeFromDate(start);
  const endTime = addMinutesToTime(startTime, liveClass.durationMinutes);

  const base: IBatchScheduleSlot = {
    dayOfWeek: start.getDay() as IBatchScheduleSlot["dayOfWeek"],
    startTime,
    endTime,
    title: liveClass.title,
    recurrence,
    liveClassId: liveClass._id,
  };

  if (recurrence === "monthly") {
    base.monthDay = start.getDate();
  }

  return base;
}

export async function syncLiveClassToBatchRoutine(
  batchId: mongoose.Types.ObjectId | string,
  liveClass: Pick<ILiveClass, "_id" | "title" | "scheduledAt" | "durationMinutes">,
  recurrence: ClassRecurrence,
) {
  const batch = await Batch.findById(batchId).select("schedule").lean();
  if (!batch) return;

  const schedule = Array.isArray(batch.schedule) ? [...batch.schedule] : [];
  const withoutThisClass = schedule.filter(
    (s: IBatchScheduleSlot) => String(s.liveClassId || "") !== String(liveClass._id),
  );

  const slot = buildScheduleSlotFromLiveClass(liveClass, recurrence);
  const nextSchedule = slot ? [...withoutThisClass, slot] : withoutThisClass;

  await Batch.findByIdAndUpdate(batchId, { $set: { schedule: nextSchedule } });
}

export async function removeLiveClassFromBatchRoutine(
  batchId: mongoose.Types.ObjectId | string,
  liveClassId: mongoose.Types.ObjectId | string,
) {
  const batch = await Batch.findById(batchId).select("schedule").lean();
  if (!batch) return;

  const schedule = (Array.isArray(batch.schedule) ? batch.schedule : []).filter(
    (s: IBatchScheduleSlot) => String(s.liveClassId || "") !== String(liveClassId),
  );

  await Batch.findByIdAndUpdate(batchId, { $set: { schedule } });
}
