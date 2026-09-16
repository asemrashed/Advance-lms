import Batch from "@/models/Batch";
import InAppNotification, {
  type InAppNotificationType,
} from "@/models/InAppNotification";
import { listActivePaidBatchStudentIds } from "@/app/api/_lib/liveEnrollment";
import { toObjectId } from "@/app/api/_lib/phase12";

function formatWhen(iso: Date | string | undefined): string {
  if (!iso) return "—";
  try {
    const d = iso instanceof Date ? iso : new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

async function enrolledStudentIds(batchId: string): Promise<string[]> {
  return listActivePaidBatchStudentIds(batchId);
}

async function batchInstructorIds(batchId: string): Promise<string[]> {
  const batch = await Batch.findById(batchId)
    .select("instructorId instructorIds")
    .lean();
  if (!batch) return [];
  const ids = new Set<string>();
  if (batch.instructorId) ids.add(String(batch.instructorId));
  if (Array.isArray(batch.instructorIds)) {
    for (const id of batch.instructorIds) ids.add(String(id));
  }
  return [...ids];
}

function uniqueRecipientIds(...groups: string[][]) {
  return [...new Set(groups.flat().filter(Boolean))];
}

async function batchName(batchId: string): Promise<string> {
  const row = await Batch.findById(batchId).select("name").lean();
  return String(row?.name ?? "Batch");
}

export async function notifyBatchStudentsScheduleChange(input: {
  batchId: string;
  type: InAppNotificationType;
  title: string;
  message: string;
  liveClassId?: string;
  routineSlotId?: string;
  metadata?: Record<string, unknown>;
  /** Additional instructors to notify (e.g. class or slot instructor). */
  instructorIds?: string[];
}) {
  const [studentIds, batchInstructors] = await Promise.all([
    enrolledStudentIds(input.batchId),
    batchInstructorIds(input.batchId),
  ]);
  const recipientIds = uniqueRecipientIds(
    studentIds,
    batchInstructors,
    input.instructorIds ?? [],
  );
  if (recipientIds.length === 0) return 0;

  const docs = recipientIds.map((userId) => ({
    userId: toObjectId(userId),
    type: input.type,
    title: input.title,
    message: input.message,
    batchId: toObjectId(input.batchId),
    liveClassId: input.liveClassId ? toObjectId(input.liveClassId) : undefined,
    routineSlotId: input.routineSlotId
      ? toObjectId(input.routineSlotId)
      : undefined,
    metadata: input.metadata,
    isRead: false,
  }));

  await InAppNotification.insertMany(docs, { ordered: false });
  return docs.length;
}

export async function notifyLiveClassScheduled(
  batchId: string,
  liveClass: {
    _id: unknown;
    title: string;
    scheduledAt: Date;
    instructorId?: unknown;
  },
) {
  const name = await batchName(batchId);
  return notifyBatchStudentsScheduleChange({
    batchId,
    type: "live_class_scheduled",
    title: "New class scheduled",
    message: `"${liveClass.title}" was added to ${name} on ${formatWhen(liveClass.scheduledAt)}.`,
    liveClassId: String(liveClass._id),
    instructorIds: liveClass.instructorId
      ? [String(liveClass.instructorId)]
      : undefined,
    metadata: {
      scheduledAt: liveClass.scheduledAt.toISOString(),
    },
  });
}

export async function notifyLiveClassCancelled(
  batchId: string,
  liveClass: {
    _id: unknown;
    title: string;
    scheduledAt?: Date;
    instructorId?: unknown;
  },
) {
  const name = await batchName(batchId);
  return notifyBatchStudentsScheduleChange({
    batchId,
    type: "live_class_cancelled",
    title: "Class cancelled",
    message: `"${liveClass.title}" in ${name} was cancelled${
      liveClass.scheduledAt
        ? ` (was ${formatWhen(liveClass.scheduledAt)})`
        : ""
    }.`,
    liveClassId: String(liveClass._id),
    instructorIds: liveClass.instructorId
      ? [String(liveClass.instructorId)]
      : undefined,
  });
}

export async function notifyLiveClassUpdated(
  batchId: string,
  liveClass: { _id: unknown; title: string; instructorId?: unknown },
  changes: string[],
  before?: { scheduledAt?: Date },
  after?: { scheduledAt?: Date },
) {
  if (changes.length === 0) return 0;
  const name = await batchName(batchId);
  const detail =
    before?.scheduledAt && after?.scheduledAt
      ? ` New time: ${formatWhen(after.scheduledAt)} (was ${formatWhen(before.scheduledAt)}).`
      : "";
  return notifyBatchStudentsScheduleChange({
    batchId,
    type: "live_class_updated",
    title: "Class schedule updated",
    message: `"${liveClass.title}" in ${name} was updated (${changes.join(", ")}).${detail}`,
    liveClassId: String(liveClass._id),
    instructorIds: liveClass.instructorId
      ? [String(liveClass.instructorId)]
      : undefined,
    metadata: {
      changes,
      previousScheduledAt: before?.scheduledAt?.toISOString(),
      scheduledAt: after?.scheduledAt?.toISOString(),
    },
  });
}

export function liveClassChangeLabels(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const changes: string[] = [];
  if (
    before.scheduledAt &&
    after.scheduledAt &&
    new Date(String(before.scheduledAt)).getTime() !==
      new Date(String(after.scheduledAt)).getTime()
  ) {
    changes.push("time");
  }
  if (before.title !== after.title) changes.push("title");
  if (before.meetLink !== after.meetLink) changes.push("meeting link");
  if (before.durationMinutes !== after.durationMinutes) changes.push("duration");
  if (before.recurrence !== after.recurrence) changes.push("recurrence");
  if (before.type !== after.type) changes.push("type");
  return changes;
}

export async function notifyRoutineSlotUpdated(
  batchId: string,
  slot: { _id: unknown; topic?: string; instructorId?: unknown },
  changes: string[],
) {
  if (changes.length === 0) return 0;
  const name = await batchName(batchId);
  const topic = String(slot.topic ?? "Routine slot");
  return notifyBatchStudentsScheduleChange({
    batchId,
    type: "routine_updated",
    title: "Weekly routine updated",
    message: `${topic} in ${name} was changed (${changes.join(", ")}).`,
    routineSlotId: String(slot._id),
    instructorIds: slot.instructorId ? [String(slot.instructorId)] : undefined,
    metadata: { changes },
  });
}

export function routineSlotChangeLabels(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const changes: string[] = [];
  if (before.dayOfWeek !== after.dayOfWeek) changes.push("day");
  if (before.startTime !== after.startTime) changes.push("start time");
  if (before.endTime !== after.endTime) changes.push("end time");
  if (before.topic !== after.topic) changes.push("topic");
  if (before.status !== after.status) changes.push("status");
  return changes;
}

export async function notifyRoutineSlotRemoved(
  batchId: string,
  slot: { _id: unknown; topic?: string; instructorId?: unknown },
) {
  const name = await batchName(batchId);
  const topic = String(slot.topic ?? "Routine slot");
  return notifyBatchStudentsScheduleChange({
    batchId,
    type: "routine_removed",
    title: "Routine slot removed",
    message: `${topic} was removed from ${name}'s weekly routine.`,
    routineSlotId: String(slot._id),
    instructorIds: slot.instructorId ? [String(slot.instructorId)] : undefined,
  });
}

export async function notifyRoutinePublished(
  batchId: string,
  publishedCount: number,
) {
  if (publishedCount <= 0) return 0;
  const name = await batchName(batchId);
  return notifyBatchStudentsScheduleChange({
    batchId,
    type: "routine_published",
    title: "New classes published",
    message: `${publishedCount} new session${
      publishedCount === 1 ? "" : "s"
    } were published to ${name}'s schedule.`,
    metadata: { publishedCount },
  });
}

export function mapInAppNotification(row: Record<string, unknown>) {
  return {
    _id: String(row._id ?? ""),
    type: String(row.type ?? ""),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    batchId: row.batchId ? String(row.batchId) : undefined,
    liveClassId: row.liveClassId ? String(row.liveClassId) : undefined,
    routineSlotId: row.routineSlotId ? String(row.routineSlotId) : undefined,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    isRead: Boolean(row.isRead),
    readAt:
      row.readAt instanceof Date
        ? row.readAt.toISOString()
        : row.readAt
          ? String(row.readAt)
          : undefined,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt ?? ""),
  };
}
