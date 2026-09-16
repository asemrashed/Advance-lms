"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LuCalendarCheck,
  LuCheck,
  LuClipboardList,
  LuPercent,
  LuX,
} from "react-icons/lu";
import { StudentRoleShell } from "@/components/role-area/StudentRoleShell";
import { cn } from "@/lib/cn";
import { studentPortalService } from "@/services/studentPortalService";

type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  percentage: number;
  statuses: Record<string, number>;
};

type CourseAttendance = {
  courseId: string;
  courseTitle: string;
  statuses: Record<string, number>;
  total: number;
  present: number;
  percentage: number;
};

type AttendanceHistory = {
  _id: string;
  liveClassId: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseTitle: string;
  classTitle: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  markedAt: string;
};

type AttendanceData = {
  summary: AttendanceSummary;
  courses: CourseAttendance[];
  history: AttendanceHistory[];
};

const EMPTY_DATA: AttendanceData = {
  summary: {
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
    statuses: {},
  },
  courses: [],
  history: [],
};

function statusLabel(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status: string) {
  if (status === "present") {
    return {
      icon: <LuCheck />,
      className: "bg-green-100 text-green-700",
    };
  }
  if (status === "absent") {
    return {
      icon: <LuX />,
      className: "bg-red-100 text-red-700",
    };
  }
  if (status === "late") {
    return {
      icon: <span aria-hidden>◷</span>,
      className: "bg-orange-100 text-orange-700",
    };
  }
  return {
    icon: <span aria-hidden>•</span>,
    className: "bg-muted text-muted-foreground",
  };
}

export default function StudentAttendanceClient() {
  const [data, setData] = useState<AttendanceData>(EMPTY_DATA);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await studentPortalService.getAttendance();
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load attendance");
        }
        if (!cancelled) setData(payload.data || EMPTY_DATA);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load attendance",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredHistory = useMemo(
    () =>
      selectedCourse === "all"
        ? data.history
        : data.history.filter((row) => row.courseId === selectedCourse),
    [data.history, selectedCourse],
  );

  const lowAttendanceCourses = data.courses.filter(
    (course) => course.total > 0 && course.percentage < 90,
  );
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference *
    (1 - Math.min(Math.max(data.summary.percentage, 0), 100) / 100);

  const kpis = [
    {
      label: "Total Classes",
      value: data.summary.total,
      icon: <LuCalendarCheck />,
      className: "text-primary bg-primary/10",
    },
    {
      label: "Present",
      value: data.summary.present,
      icon: <LuCheck />,
      className: "text-green-700 bg-green-100",
    },
    {
      label: "Absent",
      value: data.summary.absent,
      icon: <LuX />,
      className: "text-red-700 bg-red-100",
    },
    {
      label: "Attendance Rate",
      value: `${data.summary.percentage}%`,
      icon: <LuPercent />,
      className: "text-primary bg-primary/10",
    },
  ];

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-3 sm:p-5 lg:p-7">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-foreground">My Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your class attendance across all courses
          </p>
        </header>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mb-5 flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-gradient-to-br from-primary to-emerald-600 p-6 text-primary-foreground shadow-lg sm:p-8">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative size-28 shrink-0">
              <svg
                aria-label={`${data.summary.percentage}% overall attendance`}
                className="-rotate-90"
                height="112"
                role="img"
                width="112"
              >
                <circle
                  cx="56"
                  cy="56"
                  fill="none"
                  r={ringRadius}
                  stroke="rgba(255,255,255,.22)"
                  strokeWidth="9"
                />
                <circle
                  cx="56"
                  cy="56"
                  fill="none"
                  r={ringRadius}
                  stroke="currentColor"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  strokeWidth="9"
                />
              </svg>
              <div className="absolute inset-0 grid place-content-center text-center">
                <strong className="text-2xl">{data.summary.percentage}%</strong>
                <span className="text-[10px] font-bold uppercase text-white/70">
                  Overall
                </span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-extrabold">
                {data.summary.total
                  ? data.summary.percentage >= 90
                    ? "Great attendance!"
                    : "Keep building your attendance"
                  : "Attendance will appear here"}
              </h2>
              <p className="mt-2 text-sm text-white/80">
                {data.summary.total
                  ? `You have attended ${data.summary.present} of ${data.summary.total} recorded classes across all courses.`
                  : "No attendance has been recorded for your classes yet."}
              </p>
            </div>
          </div>
          {data.summary.total ? (
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold">
              {data.summary.percentage >= 90
                ? "✓ At or above 90%"
                : `${90 - data.summary.percentage}% below 90%`}
            </span>
          ) : null}
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm"
              key={kpi.label}
            >
              <div
                className={cn(
                  "grid size-11 place-items-center rounded-xl text-xl",
                  kpi.className,
                )}
              >
                {kpi.icon}
              </div>
              <div>
                <div className="text-2xl font-extrabold">{kpi.value}</div>
                <div className="text-xs font-semibold text-muted-foreground">
                  {kpi.label}
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <h2 className="flex items-center gap-2 font-extrabold">
                <LuClipboardList className="text-primary" />
                Attendance History
              </h2>
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                <button
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold",
                    selectedCourse === "all"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:border-primary hover:text-primary",
                  )}
                  onClick={() => setSelectedCourse("all")}
                  type="button"
                >
                  All Courses
                </button>
                {data.courses.map((course) => (
                  <button
                    className={cn(
                      "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold",
                      selectedCourse === course.courseId
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary hover:text-primary",
                    )}
                    key={course.courseId}
                    onClick={() => setSelectedCourse(course.courseId)}
                    type="button"
                  >
                    {course.courseTitle}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading attendance…
              </div>
            ) : filteredHistory.length ? (
              filteredHistory.map((row) => {
                const scheduledAt = new Date(row.scheduledAt);
                const style = statusStyle(row.status);
                return (
                  <article
                    className="flex items-center gap-4 border-b p-4 last:border-b-0"
                    key={row._id}
                  >
                    <div className="w-12 shrink-0 text-center">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">
                        {scheduledAt.toLocaleDateString([], { month: "short" })}
                      </div>
                      <div className="text-xl font-extrabold">
                        {scheduledAt.getDate()}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold">
                        {row.courseTitle} — {row.classTitle}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {scheduledAt.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {row.batchName}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold",
                        style.className,
                      )}
                    >
                      {style.icon}
                      {statusLabel(row.status)}
                    </span>
                  </article>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No attendance records match this course.
              </div>
            )}
          </section>

          <aside className="h-fit overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b p-4">
              <h2 className="font-extrabold">By Course</h2>
            </div>
            {data.courses.length ? (
              data.courses.map((course) => (
                <div className="border-b p-4 last:border-b-0" key={course.courseId}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="truncate text-sm font-bold">
                      {course.courseTitle}
                    </h3>
                    <strong
                      className={
                        course.percentage >= 90
                          ? "text-green-700"
                          : "text-orange-700"
                      }
                    >
                      {course.percentage}%
                    </strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        course.percentage >= 90
                          ? "bg-primary"
                          : "bg-orange-500",
                      )}
                      style={{ width: `${course.percentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {course.present} / {course.total} classes attended
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {Object.entries(course.statuses).map(([status, count]) => (
                      <span
                        className="text-[10px] text-muted-foreground"
                        key={status}
                      >
                        {statusLabel(status)}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No course attendance yet.
              </div>
            )}

            {lowAttendanceCourses.length ? (
              <div className="m-4 rounded-xl bg-orange-50 p-4 text-xs leading-relaxed text-orange-800">
                <strong className="mb-1 block">⚠ Attendance Notice</strong>
                {lowAttendanceCourses.map((course) => course.courseTitle).join(", ")}{" "}
                {lowAttendanceCourses.length === 1 ? "is" : "are"} below 90%
                attendance.
              </div>
            ) : null}
          </aside>
        </div>
      </main>
    </StudentRoleShell>
  );
}
