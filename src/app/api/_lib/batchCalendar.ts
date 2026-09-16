import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { ILiveClass } from "@/models/LiveClass";

export type BatchCalendarEvent = {
  id: string;
  type: "live_class" | "assignment" | "exam" | "batch";
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color: string;
};

function parseRecurrence(value: unknown): "once" | "weekly" | "monthly" {
  if (value === "weekly" || value === "monthly") return value;
  return "once";
}

export function expandLiveClassEvents(
  liveClasses: Array<{
    _id: unknown;
    title: string;
    scheduledAt: Date;
    durationMinutes: number;
    recurrence?: unknown;
    isActive?: boolean;
  }>,
  rangeStart: Date,
  rangeEnd: Date,
): BatchCalendarEvent[] {
  const events: BatchCalendarEvent[] = [];

  for (const lc of liveClasses) {
    if (lc.isActive === false) continue;

    const baseStart = new Date(lc.scheduledAt);
    const recurrence = parseRecurrence(lc.recurrence);
    const durationMs = lc.durationMinutes * 60 * 1000;

    const pushInstance = (start: Date) => {
      if (start < rangeStart || start > rangeEnd) return;
      const end = new Date(start.getTime() + durationMs);
      events.push({
        id: `${String(lc._id)}-${start.toISOString()}`,
        type: "live_class",
        title: lc.title,
        start: start.toISOString(),
        end: end.toISOString(),
        color: "#7c3aed",
      });
    };

    if (recurrence === "once") {
      pushInstance(baseStart);
      continue;
    }

    if (recurrence === "weekly") {
      let cursor = new Date(baseStart);
      while (cursor < rangeStart) {
        cursor = addDays(cursor, 7);
      }
      while (cursor <= rangeEnd) {
        pushInstance(cursor);
        cursor = addDays(cursor, 7);
      }
      continue;
    }

    if (recurrence === "monthly") {
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
        if (instance >= rangeStart && instance <= rangeEnd) {
          pushInstance(instance);
        }
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }
  }

  return events;
}

export function getCalendarRange(year: number, month: number) {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const rangeStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return { monthStart, monthEnd, rangeStart, rangeEnd };
}

export function buildMonthGrid(year: number, month: number) {
  const { monthStart, rangeStart, rangeEnd } = getCalendarRange(year, month);
  const weeks: Date[][] = [];
  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return { weeks, monthStart };
}

export function eventsForDay(events: BatchCalendarEvent[], day: Date) {
  return events.filter((e) => isSameDay(new Date(e.start), day));
}

export function isInViewMonth(day: Date, monthStart: Date) {
  return isSameMonth(day, monthStart);
}

export function formatMonthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}
