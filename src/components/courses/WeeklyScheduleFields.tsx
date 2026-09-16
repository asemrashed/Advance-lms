"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

export const SCHEDULE_DAY_LABELS = [
  { value: 0, short: "Su", label: "Sunday" },
  { value: 1, short: "Mo", label: "Monday" },
  { value: 2, short: "Tu", label: "Tuesday" },
  { value: 3, short: "We", label: "Wednesday" },
  { value: 4, short: "Th", label: "Thursday" },
  { value: 5, short: "Fr", label: "Friday" },
  { value: 6, short: "Sa", label: "Saturday" },
] as const;

export const SCHEDULE_DURATION_OPTIONS = [
  { label: "45 minutes", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "1.5 hours", minutes: 90 },
  { label: "2 hours", minutes: 120 },
];

export type DayScheduleEntry = {
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  slotId?: string;
};

type WeeklyScheduleFieldsProps = {
  days: DayScheduleEntry[];
  topic: string;
  meetLink?: string;
  showMeetLink?: boolean;
  onToggleDay: (dayOfWeek: number) => void;
  onUpdateDay: (
    dayOfWeek: number,
    patch: Partial<Pick<DayScheduleEntry, "startTime" | "durationMinutes">>,
  ) => void;
  onTopicChange: (topic: string) => void;
  onMeetLinkChange?: (meetLink: string) => void;
};

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh || 0) * 60 + (em || 0) - ((sh || 0) * 60 + (sm || 0));
  if (diff <= 0) diff += 24 * 60;
  const allowed = SCHEDULE_DURATION_OPTIONS.map((o) => o.minutes);
  if (allowed.includes(diff)) return diff;
  // nearest option
  return allowed.reduce((best, cur) =>
    Math.abs(cur - diff) < Math.abs(best - diff) ? cur : best,
  );
}

export function formatScheduleLabel(days: DayScheduleEntry[]): string {
  if (days.length === 0) return "Not set";
  return days
    .map((d) => {
      const label = SCHEDULE_DAY_LABELS.find((x) => x.value === d.dayOfWeek)?.short;
      return `${label} ${d.startTime}`;
    })
    .join(" · ");
}

export function WeeklyScheduleFields({
  days,
  topic,
  meetLink = "",
  showMeetLink = true,
  onToggleDay,
  onUpdateDay,
  onTopicChange,
  onMeetLinkChange,
}: WeeklyScheduleFieldsProps) {
  const selected = new Set(days.map((d) => d.dayOfWeek));
  const orderedDays = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Class Days <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_DAY_LABELS.map((d) => {
            const isOn = selected.has(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => onToggleDay(d.value)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  isOn
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary",
                )}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Each selected day can have its own start time and duration.
        </p>
      </div>

      {orderedDays.length > 0 ? (
        <div className="space-y-3">
          {orderedDays.map((day) => {
            const meta = SCHEDULE_DAY_LABELS.find((x) => x.value === day.dayOfWeek);
            return (
              <div
                key={day.dayOfWeek}
                className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-[7rem_1fr_1fr]"
              >
                <div className="flex items-center text-sm font-semibold">
                  {meta?.label || `Day ${day.dayOfWeek}`}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start time</Label>
                  <Input
                    type="time"
                    value={day.startTime}
                    onChange={(e) =>
                      onUpdateDay(day.dayOfWeek, { startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Duration</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={day.durationMinutes}
                    onChange={(e) =>
                      onUpdateDay(day.dayOfWeek, {
                        durationMinutes: Number(e.target.value),
                      })
                    }
                  >
                    {SCHEDULE_DURATION_OPTIONS.map((o) => (
                      <option key={o.minutes} value={o.minutes}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label>Default topic</Label>
        <Input
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="Weekly class"
        />
      </div>

      {showMeetLink ? (
        <div className="space-y-1.5">
          <Label>Google Meet Link (optional)</Label>
          <Input
            type="url"
            value={meetLink}
            onChange={(e) => onMeetLinkChange?.(e.target.value)}
            placeholder="https://meet.google.com/..."
          />
          <p className="text-xs text-muted-foreground">
            Permanent link for this batch. Every lesson live class uses it
            automatically so students and teachers join the same room.
          </p>
        </div>
      ) : null}
    </div>
  );
}
