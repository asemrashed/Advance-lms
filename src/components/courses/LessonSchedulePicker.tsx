"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCHEDULE_DAY_LABELS } from "@/components/courses/WeeklyScheduleFields";

export type LessonScheduleSlot = {
  dayOfWeek: number;
  startTime: string;
  status?: string;
};

type DayOption = {
  dateKey: string;
  time: string;
  label: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDatetimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function normalizeScheduleTime(value: string): string {
  const raw = String(value || "").trim();
  const mer = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (mer) {
    let hours = Number(mer[1]);
    const minutes = mer[2];
    const period = mer[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${pad(hours)}:${minutes}`;
  }
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${pad(Number(match[1]))}:${match[2]}`;
  return "17:00";
}

function formatTime12(hhmm: string) {
  const [hours, minutes] = normalizeScheduleTime(hhmm).split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${pad(minutes)} ${period}`;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDraft(value: string): { dateKey: string; time: string } | null {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return null;
  return { dateKey: match[1], time: match[2] };
}

function weekdayTimeMap(slots: LessonScheduleSlot[]) {
  const map = new Map<number, string>();
  for (const slot of slots) {
    if (slot.status === "inactive") continue;
    if (!Number.isFinite(slot.dayOfWeek)) continue;
    if (map.has(slot.dayOfWeek)) continue;
    map.set(slot.dayOfWeek, normalizeScheduleTime(slot.startTime));
  }
  return map;
}

function datesInMonth(year: number, month: number, dayOfWeek: number) {
  const last = new Date(year, month + 1, 0).getDate();
  const dates: Date[] = [];
  for (let day = 1; day <= last; day += 1) {
    const date = new Date(year, month, day);
    if (date.getDay() === dayOfWeek) dates.push(date);
  }
  return dates;
}

function monthDayOptions(
  timesByWeekday: Map<number, string>,
  year: number,
  month: number,
): DayOption[] {
  const options: DayOption[] = [];
  for (const [dayOfWeek, time] of timesByWeekday) {
    const dayLabel =
      SCHEDULE_DAY_LABELS.find((row) => row.value === dayOfWeek)?.label || "Day";
    for (const date of datesInMonth(year, month, dayOfWeek)) {
      options.push({
        dateKey: formatDateKey(date),
        time,
        label: `${dayLabel}, ${date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })} · ${formatTime12(time)}`,
      });
    }
  }
  options.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return options;
}

export function nextUpcomingScheduleValue(slots: LessonScheduleSlot[]): string {
  const timesByWeekday = weekdayTimeMap(slots);
  if (timesByWeekday.size === 0) return "";
  const now = new Date();
  const todayKey = formatDateKey(now);
  const thisMonth = monthDayOptions(
    timesByWeekday,
    now.getFullYear(),
    now.getMonth(),
  );
  const upcoming = thisMonth.filter((row) => {
    if (row.dateKey > todayKey) return true;
    if (row.dateKey < todayKey) return false;
    const [hours, minutes] = row.time.split(":").map(Number);
    return (
      hours > now.getHours() ||
      (hours === now.getHours() && minutes >= now.getMinutes())
    );
  });
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = monthDayOptions(
    timesByWeekday,
    nextMonthDate.getFullYear(),
    nextMonthDate.getMonth(),
  );
  const next = upcoming[0] || nextMonth[0];
  return next ? `${next.dateKey}T${next.time}` : "";
}

function timeForDate(dateKey: string, timesByWeekday: Map<number, string>) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return "";
  const weekday = new Date(year, month - 1, day).getDay();
  return timesByWeekday.get(weekday) || "";
}

type LessonSchedulePickerProps = {
  value: string;
  onChange: (next: string) => void;
  slots: LessonScheduleSlot[];
};

export function LessonSchedulePicker({
  value,
  onChange,
  slots,
}: LessonSchedulePickerProps) {
  const [customDate, setCustomDate] = useState(() => {
    const parsed = parseDraft(value);
    if (!parsed) return false;
    return !timeForDate(parsed.dateKey, weekdayTimeMap(slots));
  });
  const [customTime, setCustomTime] = useState(() => {
    const parsed = parseDraft(value);
    if (!parsed) return false;
    const scheduled = timeForDate(parsed.dateKey, weekdayTimeMap(slots));
    return Boolean(scheduled && scheduled !== parsed.time);
  });

  const parsed = parseDraft(value);
  const todayKey = formatDateKey(new Date());
  const timesByWeekday = useMemo(() => weekdayTimeMap(slots), [slots]);

  const dayOptions = useMemo(() => {
    if (timesByWeekday.size === 0) return [];
    const now = new Date();
    const thisMonth = monthDayOptions(
      timesByWeekday,
      now.getFullYear(),
      now.getMonth(),
    );
    const upcoming = thisMonth.filter((row) => row.dateKey >= todayKey);
    const keepCurrent =
      parsed &&
      thisMonth.find((row) => row.dateKey === parsed.dateKey) &&
      !upcoming.some((row) => row.dateKey === parsed.dateKey)
        ? [thisMonth.find((row) => row.dateKey === parsed.dateKey)!]
        : [];
    if (upcoming.length + keepCurrent.length >= 2) {
      return [...keepCurrent, ...upcoming];
    }
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return [
      ...keepCurrent,
      ...upcoming,
      ...monthDayOptions(timesByWeekday, next.getFullYear(), next.getMonth()),
    ];
  }, [timesByWeekday, todayKey, parsed?.dateKey]);

  const matchedDay = dayOptions.find((row) => row.dateKey === parsed?.dateKey);
  const scheduledTime =
    (parsed && timeForDate(parsed.dateKey, timesByWeekday)) ||
    matchedDay?.time ||
    "";

  const applyDateAndTime = (dateKey: string, time: string) => {
    if (!dateKey) return;
    onChange(`${dateKey}T${normalizeScheduleTime(time)}`);
  };

  if (timesByWeekday.size === 0) {
    return (
      <div className="mt-2 space-y-2">
        <Label className="text-xs">Class date & time</Label>
        <p className="text-[11px] text-muted-foreground">
          No weekly schedule yet. Pick a date and time, or set days on the
          course schedule.
        </p>
        <Input
          type="date"
          value={parsed?.dateKey || ""}
          onChange={(event) =>
            applyDateAndTime(event.target.value, parsed?.time || "17:00")
          }
        />
        <Input
          type="time"
          value={parsed?.time || ""}
          onChange={(event) =>
            applyDateAndTime(parsed?.dateKey || todayKey, event.target.value)
          }
        />
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Class day</Label>
        {customDate ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setCustomDate(false);
              const next =
                dayOptions.find((row) => row.dateKey >= todayKey) ||
                dayOptions[0];
              if (next) {
                setCustomTime(false);
                applyDateAndTime(next.dateKey, next.time);
              }
            }}
          >
            Use scheduled days
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setCustomDate(true)}
          >
            Another day
          </Button>
        )}
      </div>

      {customDate ? (
        <Input
          type="date"
          value={parsed?.dateKey || ""}
          onChange={(event) => {
            const dateKey = event.target.value;
            const nextTime = customTime
              ? parsed?.time || scheduledTime || "17:00"
              : timeForDate(dateKey, timesByWeekday) ||
                parsed?.time ||
                scheduledTime ||
                "17:00";
            if (!customTime && timeForDate(dateKey, timesByWeekday)) {
              setCustomTime(false);
            }
            applyDateAndTime(dateKey, nextTime);
          }}
        />
      ) : (
        <select
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          value={matchedDay?.dateKey || ""}
          onChange={(event) => {
            const next = dayOptions.find(
              (row) => row.dateKey === event.target.value,
            );
            if (!next) return;
            setCustomTime(false);
            applyDateAndTime(next.dateKey, next.time);
          }}
        >
          {dayOptions.length === 0 ? (
            <option value="">No scheduled days this month</option>
          ) : (
            <option value="" disabled>
              Pick a scheduled day
            </option>
          )}
          {dayOptions.map((row) => (
            <option key={row.dateKey} value={row.dateKey}>
              {row.label}
            </option>
          ))}
        </select>
      )}
      <p className="text-[11px] text-muted-foreground">
        Scheduled days and times come from this batch&apos;s weekly course
        schedule.
      </p>

      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Class time</Label>
        {customTime ? (
          scheduledTime ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setCustomTime(false);
                applyDateAndTime(parsed?.dateKey || todayKey, scheduledTime);
              }}
            >
              Use schedule time
            </Button>
          ) : null
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setCustomTime(true)}
          >
            Change
          </Button>
        )}
      </div>

      {customTime ? (
        <Input
          type="time"
          value={parsed?.time || ""}
          onChange={(event) =>
            applyDateAndTime(parsed?.dateKey || todayKey, event.target.value)
          }
        />
      ) : (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
          {parsed?.time ? formatTime12(parsed.time) : "Pick a day first"}
        </p>
      )}
    </div>
  );
}
