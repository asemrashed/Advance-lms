"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LuBell,
  LuBookOpen,
  LuCalendarDays,
  LuCheck,
  LuChevronRight,
  LuCircleDollarSign,
  LuClipboardList,
  LuClock3,
  LuGraduationCap,
  LuPlay,
  LuStar,
  LuTarget,
  LuVideo,
} from "react-icons/lu";
import { StudentBatchDashboardSection } from "@/components/dashboard/BatchDashboardWidgets";
import { BatchAcademicPreviewGrid } from "@/components/academic-hub/BatchAcademicPreviewGrid";
import { MonthlyRenewalWarningBanner } from "@/components/payments/MonthlyRenewalWarningBanner";
import { StudentDashboardSkeleton } from "@/components/skeletons/DashboardSkeletons";
import { studentLearningService } from "@/services/studentLearningService";
import type {
  StudentDashboardAssignment,
  StudentDashboardBatchSummary,
  StudentDashboardCourseProgress,
  StudentDashboardEnrollment,
  StudentDashboardExam,
  StudentDashboardMetrics,
  StudentDashboardRoutineDay,
  StudentDashboardUpcomingClass,
} from "@/types/studentDashboard";

type MyCoursesData = Awaited<
  ReturnType<typeof studentLearningService.getMyCourses>
>;

export interface StudentDashboardParityProps {
  userName: string;
  loading: boolean;
  enrollments: StudentDashboardEnrollment[];
  courseProgress: StudentDashboardCourseProgress[];
  batches: StudentDashboardBatchSummary[];
  upcomingClasses: StudentDashboardUpcomingClass[];
  weeklyRoutine: StudentDashboardRoutineDay[];
  assignments: StudentDashboardAssignment[];
  upcomingExams: StudentDashboardExam[];
  metrics: StudentDashboardMetrics;
}

const cardClass =
  "overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm";

function validTime(value?: string): number {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value?: string, includeTime = false): string {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function relativeTime(value: string): string {
  const time = validTime(value);
  if (!time) return "Recently";
  const diff = time - Date.now();
  const days = Math.ceil(Math.abs(diff) / 86_400_000);
  if (Math.abs(diff) < 3_600_000) {
    const minutes = Math.max(1, Math.round(Math.abs(diff) / 60_000));
    return diff >= 0 ? `in ${minutes} min` : `${minutes} min ago`;
  }
  if (Math.abs(diff) < 86_400_000) {
    const hours = Math.max(1, Math.round(Math.abs(diff) / 3_600_000));
    return diff >= 0 ? `in ${hours} hr` : `${hours} hr ago`;
  }
  return diff >= 0 ? `in ${days} days` : `${days} days ago`;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}

function Countdown({ scheduledAt }: { scheduledAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, validTime(scheduledAt) - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <div className="flex gap-2" aria-label={`${hours} hours ${minutes} minutes until class`}>
      {[
        ["Hrs", hours],
        ["Min", minutes],
        ["Sec", seconds],
      ].map(([label, value]) => (
        <div
          key={String(label)}
          className="min-w-14 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center"
        >
          <div className="text-xl font-black tabular-nums text-primary-foreground">
            {String(value).padStart(2, "0")}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function StudentDashboardParity({
  userName,
  loading,
  enrollments,
  courseProgress,
  upcomingClasses,
  weeklyRoutine,
  assignments,
  upcomingExams,
  metrics,
}: StudentDashboardParityProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "Student";
  const [myCourses, setMyCourses] = useState<MyCoursesData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void studentLearningService
      .getMyCourses()
      .then((data) => {
        if (!cancelled) setMyCourses(data);
      })
      .catch(() => {
        if (!cancelled) {
          setMyCourses({
            overview: {
              recordedCount: 0,
              liveBatchCount: 0,
              liveCourseCount: 0,
              completedCount: 0,
              averageProgress: 0,
              hasLive: false,
            },
            live: [],
            recorded: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveCourseRows = useMemo(
    () =>
      (myCourses?.live ?? []).flatMap((course) =>
        course.batches.map((batch) => ({
          courseId: course.courseId,
          courseName: course.courseTitle,
          subject: course.subject ?? "General",
          batch,
        })),
      ),
    [myCourses],
  );
  const recordedCourseRows = myCourses?.recorded ?? [];
  const pendingAssignments = assignments.filter(
    (assignment) =>
      assignment.status === "pending" || assignment.status === "returned",
  );
  const nextExam = upcomingExams[0];
  const nextClass = useMemo(
    () =>
      [...upcomingClasses]
        .filter((item) => validTime(item.endsAt) > Date.now() || validTime(item.scheduledAt) > Date.now())
        .sort((a, b) => validTime(a.scheduledAt) - validTime(b.scheduledAt))[0],
    [upcomingClasses],
  );
  const averageProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, item) => sum + item.progress, 0) /
            enrollments.length,
        )
      : 0;
  const topicTotals = courseProgress.reduce(
    (totals, progress) => ({
      complete: totals.complete + progress.completedLessons,
      total: totals.total + progress.totalLessons,
    }),
    { complete: 0, total: 0 },
  );
  const activities = useMemo(
    () =>
      [
        ...assignments
          .filter((assignment) => assignment.status !== "pending")
          .map((assignment) => ({
            id: `assignment-${assignment._id}`,
            title:
              assignment.status === "graded"
                ? `${assignment.title} was graded`
                : `${assignment.title} was ${assignment.status}`,
            detail: assignment.courseTitle,
            timestamp: assignment.updatedAt,
            icon: assignment.status === "graded" ? "check" : "assignment",
          })),
        ...enrollments.map((enrollment) => ({
          id: `enrollment-${enrollment._id}`,
          title: `Enrolled in ${enrollment.course.title}`,
          detail: enrollment.course.category.name,
          timestamp: enrollment.enrolledAt,
          icon: "course",
        })),
        ...courseProgress
          .filter((progress) => progress.isCompleted && progress.completedAt)
          .map((progress) => ({
            id: `progress-${progress._id}`,
            title: `Completed ${
              enrollments.find((item) => item.course._id === progress.course)?.course
                .title ?? "a course"
            }`,
            detail: "Course progress",
            timestamp: progress.completedAt ?? "",
            icon: "check",
          })),
      ]
        .filter((activity) => validTime(activity.timestamp) > 0)
        .sort((a, b) => validTime(b.timestamp) - validTime(a.timestamp))
        .slice(0, 5),
    [assignments, courseProgress, enrollments],
  );

  if (loading) {
    return <StudentDashboardSkeleton />;
  }

  const examDays = nextExam
    ? Math.max(0, Math.ceil((validTime(nextExam.startDate) - Date.now()) / 86_400_000))
    : null;
  const kpis = [
    {
      label: "Enrolled Courses",
      value: enrollments.length,
      sub: `${new Set(enrollments.map((item) => item.course.instructor._id).filter(Boolean)).size} instructors`,
      icon: LuBookOpen,
    },
    {
      label: "Pending Assignments",
      value: pendingAssignments.length,
      sub: pendingAssignments[0]?.dueDate
        ? `${pendingAssignments[0].title} ${relativeTime(pendingAssignments[0].dueDate)}`
        : "Nothing awaiting submission",
      icon: LuClipboardList,
    },
    ...(metrics.attendance
      ? [
          {
            label: "Attendance",
            value: `${metrics.attendance.percentage}%`,
            sub: `${metrics.attendance.present}/${metrics.attendance.total} marked classes`,
            icon: LuCheck,
          },
        ]
      : []),
    {
      label: "Average Grade",
      value: metrics.averageGrade?.label ?? "—",
      sub: metrics.averageGrade
        ? `${metrics.averageGrade.percentage}% across ${metrics.averageGrade.gradedItems} graded items`
        : "No graded work yet",
      icon: LuStar,
    },
    {
      label: "Next Exam",
      value: examDays == null ? "—" : examDays === 0 ? "Today" : `${examDays} days`,
      sub: nextExam ? `${nextExam.title} · ${nextExam.courseTitle}` : "No upcoming exam",
      icon: LuGraduationCap,
    },
    {
      label: "Next Payment",
      value:
        (metrics.payments.renewalDueCount ?? 0) > 0
          ? metrics.payments.renewalPhase === "expired"
            ? "Overdue"
            : "Due now"
          : metrics.payments.pendingCount > 0
            ? "Pending"
            : "—",
      sub:
        (metrics.payments.renewalDueCount ?? 0) > 0
          ? `${money(metrics.payments.renewalDueAmount ?? 0)} · ${
              metrics.payments.renewalDueLabel || "monthly renewal"
            }${
              (metrics.payments.renewalDueCount ?? 0) > 1
                ? ` (+${(metrics.payments.renewalDueCount ?? 0) - 1} more)`
                : ""
            }`
          : metrics.payments.pendingCount > 0
            ? `${money(metrics.payments.pendingAmount)} awaiting completion`
            : "No payment schedule available",
      icon: LuCircleDollarSign,
    },
  ];

  return (
    <main className="w-full min-w-0 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {firstName} 👋
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
          <LuCalendarDays className="h-4 w-4 text-primary" />
          {new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </div>
      </header>

      <MonthlyRenewalWarningBanner />

      <section className="relative overflow-hidden rounded-[20px] bg-foreground px-5 py-6 text-background shadow-lg sm:px-7">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_50%,hsl(var(--primary)/0.35),transparent_60%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          {nextClass ? (
            <>
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-primary/25 text-primary">
                  <LuVideo className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                    Next live class
                  </p>
                  <h2 className="mt-1 truncate text-base font-bold text-white">
                    {nextClass.batchName} — {nextClass.title}
                  </h2>
                  <p className="mt-1 text-xs text-white/55">
                    {formatDate(nextClass.scheduledAt, true)}
                  </p>
                </div>
              </div>
              <Countdown scheduledAt={nextClass.scheduledAt} />
              {nextClass.joinUrl ? (
                <a
                  href={nextClass.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  <LuPlay className="h-4 w-4" />
                  Join class
                </a>
              ) : (
                <span className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white/60">
                  Join link not available
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary/25 text-primary">
                <LuVideo className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                  Next live class
                </p>
                <h2 className="mt-1 text-base font-bold text-white">No class scheduled</h2>
                <p className="mt-1 text-xs text-white/55">
                  New live classes will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-black text-primary-foreground">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-foreground">Good to see you, {firstName}!</h2>
            <p className="text-sm text-muted-foreground">
              {pendingAssignments.length} assignments due
              {nextExam ? ` · ${nextExam.title} ${relativeTime(nextExam.startDate)}` : ""}
            </p>
          </div>
        </div>
        <Link
          href={pendingAssignments.length > 0 ? "/student/assignments" : "/student/courses"}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          {pendingAssignments.length > 0 ? "Submit work" : "Continue learning"}
          <LuChevronRight className="h-4 w-4" />
        </Link>
      </section>

      <section
        className={`grid grid-cols-2 gap-3 ${
          kpis.length === 6 ? "xl:grid-cols-6" : "lg:grid-cols-5"
        }`}
        aria-label="Learning overview"
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article key={kpi.label} className={`${cardClass} p-3 sm:p-4`}>
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mb-3 sm:h-9 sm:w-9">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground sm:text-xs">{kpi.label}</p>
              <p className="mt-1 text-xl font-black text-foreground sm:text-2xl">{kpi.value}</p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground sm:text-[11px]">
                {kpi.sub}
              </p>
            </article>
          );
        })}
      </section>

      <BatchAcademicPreviewGrid
        noticeBoardHref="/student/notice-board"
        upcomingClasses={upcomingClasses}
        batchesHref="/student/courses"
        columns={3}
        showClassTabs
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(270px,0.75fr)]">
        <section className={cardClass}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-bold">
              <LuBookOpen className="h-5 w-5 text-primary" />
              My Courses
            </h2>
            <Link href="/student/courses" className="text-xs font-bold text-primary hover:underline">
              View all →
            </Link>
          </div>
          {myCourses === null ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : liveCourseRows.length === 0 && recordedCourseRows.length === 0 ? (
            <EmptyRow>No enrolled courses yet.</EmptyRow>
          ) : (
            <div>
              {liveCourseRows.length > 0 ? (
                <div>
                  <div className="bg-primary/5 px-5 py-2 text-[11px] font-black uppercase tracking-wider text-primary">
                    Live courses
                  </div>
                  <div className="divide-y divide-border px-5">
                    {liveCourseRows.map((course) => (
                      <div
                        key={`${course.courseId}-${course.batch.batchId}`}
                        className="flex flex-wrap items-center gap-3 py-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <LuVideo className="h-5 w-5" />
                        </div>
                        <div className="min-w-[180px] flex-1">
                          <p className="truncate text-sm font-bold">{course.courseName}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {course.subject}
                            {course.batch.batchName &&
                            course.batch.batchName !== "Live course"
                              ? ` · ${course.batch.batchName}`
                              : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                          {course.subject}
                        </span>
                        <Link
                          href={`/student/courses?tab=live&courseId=${encodeURIComponent(course.courseId)}&batchId=${encodeURIComponent(course.batch.batchId)}`}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                        >
                          Continue
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {recordedCourseRows.length > 0 ? (
                <div>
                  <div className="border-t border-border bg-muted/40 px-5 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Recorded courses
                  </div>
                  <div className="divide-y divide-border px-5">
                    {recordedCourseRows.map((course) => (
                      <div key={course._id} className="flex items-center gap-3 py-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <LuBookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {course.courseLuInfo?.title ?? "Course"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {course.courseLuInfo?.category ?? "General"}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${Math.min(100, Math.max(0, course.progress))}%`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-primary">
                              {Math.round(course.progress)}%
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/student/courses`}
                          className="hidden text-xs font-bold text-primary hover:underline sm:block"
                        >
                          Continue →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className={`${cardClass} p-5`}>
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <LuTarget className="h-4 w-4 text-primary" />
              Overall Progress
            </h2>
            <div className="relative mx-auto my-4 h-28 w-28">
              <svg className="-rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  className="text-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * averageProgress) / 100}
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-2xl font-black text-primary">{averageProgress}%</strong>
                <span className="text-[10px] uppercase text-muted-foreground">Complete</span>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {topicTotals.total > 0
                ? `${topicTotals.complete} of ${topicTotals.total} lessons covered`
                : "Lesson totals are not available yet"}
            </p>
          </section>

          <section className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                <LuGraduationCap className="h-4 w-4 text-primary" />
                Next Exam
              </h2>
              <Link href="/student/exams" className="text-xs font-bold text-primary">
                View →
              </Link>
            </div>
            {nextExam ? (
              <div className="mt-3">
                <p className="text-sm font-bold">{nextExam.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nextExam.courseTitle} · {formatDate(nextExam.startDate, true)}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                  {nextExam.durationMinutes} minutes
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No upcoming exam.</p>
            )}
          </section>

          <section className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                <LuCircleDollarSign className="h-4 w-4 text-primary" />
                Payments
              </h2>
              <Link href="/student/payments" className="text-xs font-bold text-primary">
                View all →
              </Link>
            </div>
            <p className="mt-3 text-2xl font-black">
              {money(
                (metrics.payments.renewalDueCount ?? 0) > 0
                  ? (metrics.payments.renewalDueAmount ?? 0)
                  : metrics.payments.pendingAmount,
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(metrics.payments.renewalDueCount ?? 0) > 0
                ? `${metrics.payments.renewalDueCount} monthly renewal${
                    (metrics.payments.renewalDueCount ?? 0) > 1 ? "s" : ""
                  } due · pay to keep access`
                : metrics.payments.pendingCount > 0
                  ? `${metrics.payments.pendingCount} pending transaction(s)`
                  : "No pending transactions · future due dates are not scheduled"}
            </p>
            <Link
              href="/student/payments"
              className="mt-4 inline-flex w-full justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Manage payments
            </Link>
          </section>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-bold">
              <LuClipboardList className="h-5 w-5 text-primary" />
              My Assignments
            </h2>
            <Link href="/student/assignments" className="text-xs font-bold text-primary">
              View all →
            </Link>
          </div>
          {assignments.length === 0 ? (
            <EmptyRow>No published assignments for your courses.</EmptyRow>
          ) : (
            <div className="divide-y divide-border px-5">
              {assignments.slice(0, 5).map((assignment) => {
                const href = `/student/assignments/${assignment._id}`;
                const isSubmitted =
                  assignment.status === "submitted" ||
                  assignment.status === "graded" ||
                  assignment.status === "returned";
                const isOverdue = assignment.status === "overdue";
                const isPending = assignment.status === "pending";

                const statusLabel = isOverdue
                  ? "Time over"
                  : assignment.status === "graded" && assignment.grade
                    ? assignment.grade
                    : assignment.status;

                const statusClass = isOverdue
                  ? "text-red-600"
                  : isSubmitted
                    ? "text-emerald-600"
                    : "text-amber-600";

                return (
                  <div
                    key={assignment._id}
                    className="flex items-center gap-3 py-4"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isOverdue
                          ? "bg-red-50 text-red-600"
                          : isSubmitted
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {isSubmitted ? (
                        <LuCheck className="h-4 w-4" />
                      ) : (
                        <LuClock3 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{assignment.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {assignment.courseTitle}
                        {assignment.dueDate ? ` · Due ${formatDate(assignment.dueDate)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                      <span className={`text-[10px] font-bold capitalize ${statusClass}`}>
                        {statusLabel}
                      </span>
                      {isPending ? (
                        <Link
                          href={href}
                          className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground"
                        >
                          Submit
                        </Link>
                      ) : isSubmitted ? (
                        <Link
                          href={href}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          View submission
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={cardClass}>
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-bold">
              <LuBell className="h-5 w-5 text-primary" />
              Recent Activity
            </h2>
          </div>
          {activities.length === 0 ? (
            <EmptyRow>Your recent learning activity will appear here.</EmptyRow>
          ) : (
            <div className="divide-y divide-border px-5">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {activity.icon === "check" ? (
                      <LuCheck className="h-4 w-4" />
                    ) : activity.icon === "assignment" ? (
                      <LuClipboardList className="h-4 w-4" />
                    ) : (
                      <LuBookOpen className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{activity.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeTime(activity.timestamp)} · {activity.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <StudentBatchDashboardSection
        weeklyRoutine={weeklyRoutine}
      />
    </main>
  );
}
