"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuCalendarDays,
  LuChevronLeft,
  LuChevronRight,
  LuClock3,
  LuExternalLink,
} from "react-icons/lu";
import { StudentRoleShell } from "@/components/role-area/StudentRoleShell";
import { cn } from "@/lib/cn";
import { studentPortalService } from "@/services/studentPortalService";

type RoutineSlot = {
  _id: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseTitle: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  instructorName: string;
  batchStartDate?: string;
  batchEndDate?: string;
};

type LiveClass = {
  _id: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseTitle: string;
  routineSlotId?: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  instructorName: string;
  type: "live" | "recorded";
  joinUrl?: string;
};

type Assessment = {
  _id: string;
  kind: "exam" | "assignment";
  title: string;
  courseTitle: string;
  scheduledAt: string;
  durationMinutes?: number;
  totalMarks: number;
  href: string;
};

type ScheduleSession = {
  id: string;
  batchId: string;
  courseKey: string;
  courseTitle: string;
  batchName: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  instructorName: string;
  joinUrl?: string;
  isLiveClass: boolean;
};

const COLOR_CLASSES = [
  "bg-primary",
  "bg-blue-600",
  "bg-orange-600",
  "bg-pink-600",
  "bg-cyan-700",
  "bg-violet-600",
];

function startOfWeek(anchor: Date) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function daysInWeek(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function sameDay(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

function hourLabel(hour: number) {
  return new Date(2000, 0, 1, hour).toLocaleTimeString([], {
    hour: "numeric",
  });
}

function localDateTime(day: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const result = new Date(day);
  result.setHours(hour || 0, minute || 0, 0, 0);
  return result;
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function StudentScheduleClient() {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const allDays = useMemo(() => daysInWeek(weekAnchor), [weekAnchor]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");
    const from = allDays[0];
    const to = new Date(allDays[6]);
    to.setHours(23, 59, 59, 999);
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const response = await studentPortalService.getSchedule(params.toString());
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load schedule");
      }
      setRoutine(payload.data?.routine || []);
      setLiveClasses(payload.data?.liveClasses || []);
      setAssessments(payload.data?.assessments || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load schedule",
      );
    } finally {
      setLoading(false);
    }
  }, [allDays]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const sessions = useMemo<ScheduleSession[]>(() => {
    const rows: ScheduleSession[] = liveClasses.map((liveClass) => {
      const startsAt = new Date(liveClass.scheduledAt);
      return {
        id: `live:${liveClass._id}`,
        batchId: liveClass.batchId,
        courseKey:
          liveClass.courseId || liveClass.courseTitle || liveClass.batchId,
        courseTitle: liveClass.courseTitle || liveClass.batchName,
        batchName: liveClass.batchName,
        title: liveClass.title,
        startsAt,
        endsAt: new Date(
          startsAt.getTime() + liveClass.durationMinutes * 60_000,
        ),
        instructorName: liveClass.instructorName,
        joinUrl: liveClass.joinUrl,
        isLiveClass: true,
      };
    });

    for (const slot of routine) {
      for (const day of allDays) {
        if (day.getDay() !== slot.dayOfWeek) continue;
        const dayTime = day.getTime();
        if (
          (slot.batchStartDate &&
            dayTime < new Date(slot.batchStartDate).setHours(0, 0, 0, 0)) ||
          (slot.batchEndDate &&
            dayTime > new Date(slot.batchEndDate).setHours(23, 59, 59, 999))
        ) {
          continue;
        }

        const startsAt = localDateTime(day, slot.startTime);
        const generatedLiveClassExists = liveClasses.some((liveClass) => {
          const liveStart = new Date(liveClass.scheduledAt);
          return (
            liveClass.routineSlotId === slot._id ||
            (liveClass.batchId === slot.batchId &&
              sameDay(liveStart, startsAt) &&
              Math.abs(liveStart.getTime() - startsAt.getTime()) < 15 * 60_000)
          );
        });
        if (generatedLiveClassExists) continue;

        rows.push({
          id: `routine:${slot._id}:${day.toISOString()}`,
          batchId: slot.batchId,
          courseKey: slot.courseId || slot.courseTitle || slot.batchId,
          courseTitle: slot.courseTitle || slot.batchName,
          batchName: slot.batchName,
          title: slot.title,
          startsAt,
          endsAt: localDateTime(day, slot.endTime),
          instructorName: slot.instructorName,
          isLiveClass: false,
        });
      }
    }
    return rows.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [allDays, liveClasses, routine]);

  const displayedDays = useMemo(() => {
    const sunday = allDays[6];
    return sessions.some((session) => sameDay(session.startsAt, sunday))
      ? allDays
      : allDays.slice(0, 6);
  }, [allDays, sessions]);

  const hours = useMemo(() => {
    if (!sessions.length) return [16, 17, 18, 19, 20];
    const sessionHours = sessions.map((session) => session.startsAt.getHours());
    const minimum = Math.min(...sessionHours);
    const maximum = Math.max(...sessionHours);
    return Array.from(
      { length: Math.max(maximum - minimum + 1, 1) },
      (_, index) => minimum + index,
    );
  }, [sessions]);

  const courseColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of sessions) {
      if (!map.has(session.courseKey)) {
        map.set(
          session.courseKey,
          COLOR_CLASSES[map.size % COLOR_CLASSES.length],
        );
      }
    }
    return map;
  }, [sessions]);

  const legend = useMemo(() => {
    const courses = new Map<string, string>();
    for (const session of sessions) {
      if (!courses.has(session.courseKey)) {
        courses.set(session.courseKey, session.courseTitle);
      }
    }
    return [...courses.entries()];
  }, [sessions]);

  const weekLabel = `Week of ${allDays[0].toLocaleDateString([], {
    day: "numeric",
  })} – ${displayedDays.at(-1)?.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;

  const moveWeek = (amount: number) => {
    setWeekAnchor((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  };

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-3 sm:p-5 lg:p-7">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">My Schedule</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Weekly class times across all enrolled courses
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm font-semibold shadow-sm">
            <LuCalendarDays className="text-primary" />
            {new Date().toLocaleDateString([], {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </header>

        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="font-extrabold">{weekLabel}</h2>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border px-4 py-2 text-xs font-bold transition hover:border-primary hover:text-primary"
              onClick={() => setWeekAnchor(new Date())}
              type="button"
            >
              Today
            </button>
            <button
              aria-label="Previous week"
              className="grid size-9 place-items-center rounded-lg border transition hover:border-primary hover:text-primary"
              onClick={() => moveWeek(-1)}
              type="button"
            >
              <LuChevronLeft />
            </button>
            <button
              aria-label="Next week"
              className="grid size-9 place-items-center rounded-lg border transition hover:border-primary hover:text-primary"
              onClick={() => moveWeek(1)}
              type="button"
            >
              <LuChevronRight />
            </button>
          </div>
        </section>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[760px]"
              style={{
                gridTemplateColumns: `72px repeat(${displayedDays.length}, minmax(112px, 1fr))`,
              }}
            >
              <div className="border-b bg-muted/60 p-3" />
              {displayedDays.map((day) => (
                <div
                  className={cn(
                    "border-b border-l bg-muted/60 p-3 text-center text-xs font-bold",
                    sameDay(day, new Date()) && "bg-primary/10 text-primary",
                  )}
                  key={day.toISOString()}
                >
                  {day.toLocaleDateString([], {
                    weekday: "short",
                    day: "numeric",
                  })}
                </div>
              ))}

              {hours.flatMap((hour) => [
                <div
                  className="border-b p-3 text-right text-xs text-muted-foreground"
                  key={`time-${hour}`}
                >
                  {hourLabel(hour)}
                </div>,
                ...displayedDays.map((day) => {
                  const cellSessions = sessions.filter(
                    (session) =>
                      sameDay(session.startsAt, day) &&
                      session.startsAt.getHours() === hour,
                  );
                  return (
                    <div
                      className="min-h-20 border-b border-l p-1.5"
                      key={`${day.toISOString()}-${hour}`}
                    >
                      <div className="space-y-1.5">
                        {cellSessions.map((session) => {
                          const content = (
                            <>
                              <div className="line-clamp-2 font-bold leading-tight">
                                {session.courseTitle} — {session.title}
                              </div>
                              <div className="mt-1 text-[10px] text-white/85">
                                {timeLabel(session.startsAt)}
                                {session.instructorName
                                  ? ` · ${session.instructorName}`
                                  : ""}
                              </div>
                            </>
                          );
                          const className = cn(
                            "block rounded-lg p-2 text-[11px] text-white shadow-sm",
                            courseColors.get(session.courseKey) || "bg-primary",
                            session.isLiveClass && "ring-2 ring-foreground/30",
                          );
                          return session.joinUrl ? (
                            <a
                              className={className}
                              href={session.joinUrl}
                              key={session.id}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {content}
                            </a>
                          ) : (
                            <div className={className} key={session.id}>
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }),
              ])}
            </div>
          </div>

          {loading ? (
            <div className="border-t p-4 text-sm text-muted-foreground">
              Loading your weekly schedule…
            </div>
          ) : !sessions.length ? (
            <div className="border-t p-6 text-center text-sm text-muted-foreground">
              No classes are scheduled for this week.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t p-4">
            {legend.map(([key, label]) => (
              <div
                className="flex items-center gap-2 text-xs text-muted-foreground"
                key={key}
              >
                <span
                  className={cn(
                    "size-2.5 rounded-sm",
                    courseColors.get(key) || "bg-primary",
                  )}
                />
                {label}
              </div>
            ))}
            {sessions.some((session) => session.isLiveClass) ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm border-2 border-foreground/50" />
                Dated live class
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-extrabold">Upcoming Assessments</h2>
          </div>
          {assessments.length ? (
            assessments.map((assessment) => {
              const date = new Date(assessment.scheduledAt);
              return (
                <Link
                  className="flex items-center gap-4 border-b p-4 transition last:border-b-0 hover:bg-muted/40"
                  href={assessment.href}
                  key={`${assessment.kind}:${assessment._id}`}
                >
                  <div className="w-12 shrink-0 text-center">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">
                      {date.toLocaleDateString([], { month: "short" })}
                    </div>
                    <div className="text-xl font-extrabold">{date.getDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold">
                      {assessment.courseTitle
                        ? `${assessment.courseTitle} — `
                        : ""}
                      {assessment.title}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <LuClock3 />
                      {date.toLocaleString([], {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {assessment.durationMinutes
                        ? ` · ${assessment.durationMinutes} min`
                        : ""}
                      {assessment.totalMarks
                        ? ` · ${assessment.totalMarks} marks`
                        : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold capitalize text-primary">
                    {assessment.kind}
                  </span>
                  <LuExternalLink className="hidden text-muted-foreground sm:block" />
                </Link>
              );
            })
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No upcoming published assessments are available.
            </div>
          )}
        </section>
      </main>
    </StudentRoleShell>
  );
}
