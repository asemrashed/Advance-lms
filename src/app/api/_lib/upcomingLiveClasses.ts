import { addDays, endOfMonth } from "date-fns";
import Batch from "@/models/Batch";
import LiveClass from "@/models/LiveClass";
import type { LiveClassRecurrence } from "@/models/LiveClass";
import type { StudentDashboardUpcomingClass } from "@/types/studentDashboard";
import { resolveMeetLink } from "@/lib/meetLink";

export type UpcomingClassStatus = "live_now" | "starting_soon" | "upcoming";

export type DerivedUpcomingLiveClass = StudentDashboardUpcomingClass & {
  liveClassId: string;
  endsAt: string;
  recurrence: LiveClassRecurrence;
  status: UpcomingClassStatus;
};

type LiveClassRow = {
  _id: unknown;
  batchId: unknown;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  recurrence?: unknown;
  type?: unknown;
  meetLink?: string;
  recordingUrl?: string;
  isActive?: boolean;
};

function parseRecurrence(value: unknown): LiveClassRecurrence {
  if (value === "weekly" || value === "monthly") return value;
  return "once";
}

function joinUrlForRow(row: LiveClassRow): string | undefined {
  if (row.type === "recorded" && row.recordingUrl) {
    return String(row.recordingUrl);
  }
  if (row.meetLink) return String(row.meetLink);
  return undefined;
}

function classStatus(
  start: Date,
  end: Date,
  now: Date,
): UpcomingClassStatus {
  if (now >= start && now <= end) return "live_now";
  const msUntilStart = start.getTime() - now.getTime();
  if (msUntilStart > 0 && msUntilStart <= 30 * 60 * 1000) return "starting_soon";
  return "upcoming";
}

function expandInstances(
  row: LiveClassRow,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  if (row.isActive === false) return [];

  const baseStart = new Date(row.scheduledAt);
  const recurrence = parseRecurrence(row.recurrence);
  const instances: Date[] = [];

  const pushIfInRange = (start: Date) => {
    if (start >= rangeStart && start <= rangeEnd) {
      instances.push(start);
    }
  };

  if (recurrence === "once") {
    pushIfInRange(baseStart);
    return instances;
  }

  if (recurrence === "weekly") {
    let cursor = new Date(baseStart);
    while (cursor < rangeStart) {
      cursor = addDays(cursor, 7);
    }
    while (cursor <= rangeEnd) {
      pushIfInRange(cursor);
      cursor = addDays(cursor, 7);
    }
    return instances;
  }

  const dayOfMonth = baseStart.getDate();
  const hour = baseStart.getHours();
  const minute = baseStart.getMinutes();
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor <= rangeEnd) {
    const lastDay = endOfMonth(cursor).getDate();
    const dom = Math.min(dayOfMonth, lastDay);
    const instance = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      dom,
      hour,
      minute,
    );
    pushIfInRange(instance);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return instances;
}

export function deriveUpcomingFromLiveClassRows(
  rows: LiveClassRow[],
  batchNameById: Map<string, string>,
  options?: { horizonDays?: number; limit?: number; includeInProgress?: boolean },
): DerivedUpcomingLiveClass[] {
  const now = new Date();
  const horizonDays = options?.horizonDays ?? 14;
  const limit = options?.limit ?? 8;
  const includeInProgress = options?.includeInProgress ?? true;
  const rangeStart = includeInProgress
    ? new Date(now.getTime() - 2 * 60 * 60 * 1000)
    : now;
  const rangeEnd = addDays(now, horizonDays);

  const derived: DerivedUpcomingLiveClass[] = [];

  for (const row of rows) {
    const liveClassId = String(row._id);
    const batchId = String(row.batchId);
    const durationMinutes = Number(row.durationMinutes) || 0;
    const durationMs = durationMinutes * 60 * 1000;
    const recurrence = parseRecurrence(row.recurrence);
    const type = row.type === "recorded" ? "recorded" : "live";
    const joinUrl = joinUrlForRow(row);

    for (const start of expandInstances(row, rangeStart, rangeEnd)) {
      const end = new Date(start.getTime() + durationMs);
      if (!includeInProgress && end < now) continue;

      derived.push({
        _id: `${liveClassId}-${start.toISOString()}`,
        liveClassId,
        batchId,
        batchName: batchNameById.get(batchId) ?? "Batch",
        title: String(row.title ?? ""),
        scheduledAt: start.toISOString(),
        endsAt: end.toISOString(),
        durationMinutes,
        type,
        recurrence,
        joinUrl,
        status: classStatus(start, end, now),
      });
    }
  }

  derived.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return derived.slice(0, limit);
}

export async function loadUpcomingLiveClassesForBatches(
  batchIds: unknown[],
  options?: { horizonDays?: number; limit?: number },
): Promise<DerivedUpcomingLiveClass[]> {
  if (batchIds.length === 0) return [];

  const rows = await LiveClass.find({
    batchId: { $in: batchIds },
    isActive: true,
  })
    .sort({ scheduledAt: 1 })
    .lean();

  const batches = await Batch.find({ _id: { $in: batchIds } })
    .select("_id name meetLink")
    .lean();
  const batchNameById = new Map<string, string>();
  const batchMeetById = new Map<string, string | undefined>();
  for (const batch of batches) {
    const id = String(batch._id);
    batchNameById.set(id, String(batch.name || "Batch"));
    batchMeetById.set(id, resolveMeetLink(undefined, batch.meetLink));
  }
  for (const row of rows) {
    const batchId = String((row as LiveClassRow).batchId);
    if (!batchNameById.has(batchId)) {
      batchNameById.set(batchId, "Batch");
    }
  }

  const rowsWithMeet = (rows as LiveClassRow[]).map((row) => ({
    ...row,
    meetLink: resolveMeetLink(row.meetLink, batchMeetById.get(String(row.batchId))),
  }));

  return deriveUpcomingFromLiveClassRows(
    rowsWithMeet,
    batchNameById,
    options,
  );
}
