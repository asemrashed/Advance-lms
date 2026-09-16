'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorLoadingState,
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { batchesService } from '@/services/batchesService';
import { instructorPortalService } from '@/services/instructorPortalService';
import { cn } from '@/lib/cn';
import {
  LuChevronLeft,
  LuChevronRight,
  LuClipboardList,
  LuLink,
  LuMessageSquare,
  LuPlus,
} from 'react-icons/lu';

type ScheduleClass = {
  _id: string;
  batchId: string;
  batchName: string;
  courseId?: string;
  courseTitle?: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  type: 'live' | 'recorded';
  enrolledCount?: number;
  maxStudents?: number;
  meetLink?: string;
  status?: string;
};

type RosterEntry = {
  studentId: string;
  name: string;
  email?: string;
  status: 'present' | 'absent' | 'late' | null;
};

const COURSE_COLORS = [
  '#6d5ce8',
  '#2563eb',
  '#ea580c',
  '#16a34a',
  '#db2777',
  '#0891b2',
];

function startOfWeekMonday(anchor: Date) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  // Monday-first week, matching the COMPLETE-7 grid (Mon … Sat).
  start.setDate(start.getDate() - ((day + 6) % 7));
  return start;
}

function weekDays(anchor: Date) {
  const start = startOfWeekMonday(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function hourLabel(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}

function timeRange(item: ScheduleClass) {
  const start = new Date(item.scheduledAt);
  const end = new Date(start.getTime() + (item.durationMinutes || 60) * 60000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function InstructorScheduleClient() {
  const [classes, setClasses] = useState<ScheduleClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = weekDays(weekAnchor);
      const from = days[0];
      const to = new Date(days[6]);
      to.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await instructorPortalService.getSchedule(params.toString());
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to load schedule');
        return;
      }
      const rows = (data?.data?.classes ?? []) as ScheduleClass[];
      setClasses(rows);
      setSelectedId((prev) =>
        rows.some((r) => r._id === prev) ? prev : rows[0]?._id || '',
      );
    } catch {
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [weekAnchor]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = classes.find((c) => c._id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setRoster([]);
      return;
    }
    let cancelled = false;
    setRosterLoading(true);
    void (async () => {
      try {
        const res = await batchesService.getAttendance(
          selected.batchId,
          selected._id,
        );
        if (!cancelled) setRoster(res.data?.roster ?? []);
      } catch {
        if (!cancelled) setRoster([]);
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
     
  }, [selected?._id]);

  const allDays = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const days = useMemo(() => {
    // Mon–Sat like the mock; show Sunday only when it has sessions.
    const sunday = allDays[6];
    const sundayHasSessions = classes.some(
      (c) => new Date(c.scheduledAt).toDateString() === sunday.toDateString(),
    );
    return sundayHasSessions ? allDays : allDays.slice(0, 6);
  }, [allDays, classes]);

  const hours = useMemo(() => {
    if (classes.length === 0) return [16, 17, 18, 19, 20];
    const hs = classes.map((c) => new Date(c.scheduledAt).getHours());
    const min = Math.min(...hs, 16);
    const max = Math.max(...hs, 20);
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [classes]);

  const courseColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes) {
      const key = c.courseId || c.courseTitle || 'course';
      if (!map.has(key)) {
        map.set(key, COURSE_COLORS[map.size % COURSE_COLORS.length]);
      }
    }
    return map;
  }, [classes]);

  const legend = useMemo(() => {
    const seen = new Map<string, { label: string; color: string }>();
    for (const c of classes) {
      const key = c.courseId || c.courseTitle || 'course';
      if (!seen.has(key)) {
        seen.set(key, {
          label: c.courseTitle || c.batchName,
          color: courseColor.get(key) || COURSE_COLORS[0],
        });
      }
    }
    return [...seen.values()];
  }, [classes, courseColor]);

  const sessionsAt = useCallback(
    (day: Date, hour: number) =>
      classes.filter((c) => {
        const d = new Date(c.scheduledAt);
        return d.toDateString() === day.toDateString() && d.getHours() === hour;
      }),
    [classes],
  );

  const weekLabel = `Week of ${allDays[0].toLocaleDateString([], {
    day: 'numeric',
  })} – ${allDays[5].toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const copyMeetLink = async () => {
    if (!selected?.meetLink) return;
    try {
      await navigator.clipboard.writeText(selected.meetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const todayKey = new Date().toDateString();
  const gridCols = `56px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="Schedule"
          subtitle="Your weekly teaching calendar across all courses"
          actions={
            <Link
              href="/instructor/materials"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <LuPlus className="h-3.5 w-3.5" />
              New Session
            </Link>
          }
        />

        {/* Week nav */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="text-sm font-extrabold">{weekLabel}</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWeekAnchor(new Date())}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold transition-colors hover:border-primary hover:text-primary"
            >
              Today
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous week"
                onClick={() =>
                  setWeekAnchor((d) => {
                    const n = new Date(d);
                    n.setDate(n.getDate() - 7);
                    return n;
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary hover:text-primary"
              >
                <LuChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next week"
                onClick={() =>
                  setWeekAnchor((d) => {
                    const n = new Date(d);
                    n.setDate(n.getDate() + 7);
                    return n;
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary hover:text-primary"
              >
                <LuChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <InstructorLoadingState label="Loading schedule…" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            {/* Week grid */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div
                    className="grid border-b border-border"
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    <div />
                    {days.map((day) => (
                      <div
                        key={day.toDateString()}
                        className={cn(
                          'px-2 py-2.5 text-center text-[11px] font-extrabold uppercase tracking-wide',
                          day.toDateString() === todayKey
                            ? 'bg-primary-container text-on-primary-container'
                            : 'text-muted-foreground',
                        )}
                      >
                        {day.toLocaleDateString([], {
                          weekday: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    ))}
                  </div>
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="grid border-b border-border last:border-b-0"
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      <div className="flex items-start justify-end px-2 py-2 text-[10px] font-bold text-muted-foreground">
                        {hourLabel(hour)}
                      </div>
                      {days.map((day) => {
                        const items = sessionsAt(day, hour);
                        return (
                          <div
                            key={`${day.toDateString()}-${hour}`}
                            className="min-h-[64px] border-l border-border p-1"
                          >
                            {items.map((item) => {
                              const key =
                                item.courseId || item.courseTitle || 'course';
                              const color =
                                courseColor.get(key) || COURSE_COLORS[0];
                              return (
                                <button
                                  key={item._id}
                                  type="button"
                                  onClick={() => setSelectedId(item._id)}
                                  className={cn(
                                    'mb-1 w-full rounded-lg px-2 py-1.5 text-left text-white last:mb-0',
                                    selectedId === item._id &&
                                      'outline outline-2 outline-offset-1 outline-foreground',
                                  )}
                                  style={{ background: color }}
                                >
                                  <div className="truncate text-[11px] font-bold">
                                    {item.courseTitle
                                      ? `${item.courseTitle} — ${item.title}`
                                      : item.title}
                                  </div>
                                  <div className="truncate text-[10px] opacity-85">
                                    {item.batchName} · {item.enrolledCount ?? 0}{' '}
                                    students
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              {legend.length > 0 ? (
                <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-3">
                  {legend.map((entry) => (
                    <div
                      key={entry.label}
                      className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: entry.color }}
                      />
                      {entry.label}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {/* Selected session detail */}
            {selected ? (
              <section className="grid gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <h3 className="text-lg font-extrabold">
                    {selected.courseTitle
                      ? `${selected.courseTitle} — ${selected.title}`
                      : selected.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.batchName} ·{' '}
                    {new Date(selected.scheduledAt).toLocaleDateString([], {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}{' '}
                    · {timeRange(selected)} ·{' '}
                    {selected.meetLink ? 'Google Meet' : 'No meet link'}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Students Enrolled
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold">
                        {selected.enrolledCount ?? 0}
                        {selected.maxStudents
                          ? ` / ${selected.maxStudents}`
                          : ''}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Topic
                      </div>
                      <div className="mt-0.5 truncate text-sm font-extrabold">
                        {selected.title}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Status
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold capitalize">
                        {selected.status || 'Scheduled'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/instructor/materials?batchId=${selected.batchId}${
                        selected.courseId ? `&courseId=${selected.courseId}` : ''
                      }`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <LuClipboardList className="h-3.5 w-3.5" />
                      Edit Session
                    </Link>
                    <button
                      type="button"
                      onClick={copyMeetLink}
                      disabled={!selected.meetLink}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <LuLink className="h-3.5 w-3.5" />
                      {copied ? 'Copied!' : 'Copy Meet Link'}
                    </button>
                    <Link
                      href="/instructor/notice-board"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold transition-colors hover:border-primary hover:text-primary"
                    >
                      <LuMessageSquare className="h-3.5 w-3.5" />
                      Message Class
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/10 p-4">
                  <h4 className="text-sm font-extrabold">Class Roster</h4>
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                    {rosterLoading ? (
                      <p className="text-xs text-muted-foreground">
                        Loading roster…
                      </p>
                    ) : roster.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No enrolled students yet.
                      </p>
                    ) : (
                      roster.map((entry) => (
                        <div
                          key={entry.studentId}
                          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/30"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container text-[11px] font-extrabold text-on-primary-container">
                            {(entry.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1 truncate text-xs font-semibold">
                            {entry.name}
                          </div>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold',
                              entry.status === 'present'
                                ? 'bg-green-100 text-green-700'
                                : entry.status === 'late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : entry.status === 'absent'
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {entry.status === 'present'
                              ? 'Present'
                              : entry.status === 'late'
                                ? 'Late'
                                : entry.status === 'absent'
                                  ? 'Absent'
                                  : 'Not marked'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sessions scheduled this week. Use Lesson Manager to add one.
              </p>
            )}
          </>
        )}
      </InstructorPage>
    </InstructorRoleShell>
  );
}
