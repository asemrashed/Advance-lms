'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { InstructorDashboardApiPayload } from '@/types/dashboard';
import { cn } from '@/lib/cn';
import { formatBdt } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import {
  InstructorCard,
  InstructorEmptyState,
  InstructorPage,
  InstructorSectionLabel,
  InstructorStatCard,
  InstructorTopbar,
  InstructorWelcomeBanner,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { InstructorDashboardSkeleton } from '@/components/skeletons/DashboardSkeletons';
import {
  LuBookOpen,
  LuCalendar,
  LuClipboardList,
  LuStar,
  LuUsers,
  LuWallet,
} from 'react-icons/lu';

type CourseTypeTab = 'live' | 'recorded';

function instructorDashboardCourseHref(
  course: InstructorDashboardApiPayload['courses'][number],
  tab: CourseTypeTab,
) {
  if (tab === 'live') {
    return `/instructor/materials?tab=live&courseId=${course._id}`;
  }
  return `/instructor/courses/${course._id}/edit`;
}

function instructorDashboardCoursePickerHref(
  course: InstructorDashboardApiPayload['courses'][number],
  tab: CourseTypeTab,
) {
  return `/instructor/courses?tab=${tab}&courseId=${encodeURIComponent(course._id)}`;
}

export interface InstructorDashboardParityProps {
  userName: string;
  loading: boolean;
  apiData: InstructorDashboardApiPayload | null;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function weekDays() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function InstructorDashboardParity({
  userName,
  loading,
  apiData,
}: InstructorDashboardParityProps) {
  const [courseTypeTab, setCourseTypeTab] = useState<CourseTypeTab>('live');
  const displayName = userName || 'Teacher';
  const upcoming = apiData?.batchSummary?.upcomingClasses ?? [];
  const todayIso = new Date().toDateString();
  const todayClasses = upcoming.filter(
    (c) => new Date(c.scheduledAt).toDateString() === todayIso,
  );
  const days = weekDays();

  const weekMap = useMemo(() => {
    const map = new Map<string, typeof upcoming>();
    for (const c of upcoming) {
      const key = new Date(c.scheduledAt).toDateString();
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [upcoming]);

  const activeCourses =
    (apiData?.courses ?? []).filter((c) => c.status === 'published').length ||
    apiData?.overview?.totalCourses ||
    0;

  const avgRating = useMemo(() => {
    if (apiData?.overview?.averageRating && apiData.overview.averageRating > 0) {
      return apiData.overview.averageRating;
    }
    const rated = (apiData?.courses ?? []).filter((c) => c.averageRating > 0);
    if (rated.length === 0) return 0;
    return (
      rated.reduce((sum, c) => sum + (c.averageRating || 0), 0) / rated.length
    );
  }, [apiData?.courses, apiData?.overview?.averageRating]);
  const pendingReviews = apiData?.overview?.pendingSubmissions ?? 0;

  const liveCourses = useMemo(
    () => (apiData?.courses ?? []).filter((course) => course.courseType === 'live'),
    [apiData?.courses],
  );
  const recordedCourses = useMemo(
    () =>
      (apiData?.courses ?? []).filter((course) => course.courseType !== 'live'),
    [apiData?.courses],
  );
  const visibleCourses =
    courseTypeTab === 'live' ? liveCourses : recordedCourses;

  if (loading) {
    return <InstructorDashboardSkeleton />;
  }

  return (
    <InstructorPage>
      <InstructorTopbar
        title="Dashboard"
        subtitle={`Welcome back, ${displayName}`}
      />

      <InstructorWelcomeBanner
        title={`${greeting()}, ${displayName}.`}
        description={`${todayClasses.length} class${todayClasses.length === 1 ? '' : 'es'} today · ${
          apiData?.overview?.totalStudents ?? 0
        } students · ${apiData?.overview?.totalEnrollments ?? 0} enrollments`}
        primaryAction={{
          label: 'Create Course',
          href: '/instructor/courses/create',
        }}
        secondaryAction={{
          label: 'Review Submissions',
          href: '/instructor/assignments',
        }}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        <InstructorStatCard
          label="Active Courses"
          value={activeCourses}
          sub={`${apiData?.overview?.totalStudents ?? 0} students total`}
          icon={<LuBookOpen className="h-5 w-5" />}
          accent="text-primary"
        />
        <InstructorStatCard
          label="This Month"
          value={formatBdt(apiData?.overview?.totalRevenue ?? 0)}
          sub={`${apiData?.overview?.successfulPayments ?? 0} successful payments`}
          icon={<LuWallet className="h-5 w-5" />}
        />
        <InstructorStatCard
          label="Enrollments"
          value={apiData?.overview?.totalEnrollments ?? 0}
          sub="Across all courses"
          icon={<LuUsers className="h-5 w-5" />}
        />
        <InstructorStatCard
          label="Pending Reviews"
          value={pendingReviews}
          sub="Assignment submissions to grade"
          icon={<LuClipboardList className="h-5 w-5" />}
          accent="text-amber-600"
        />
        <InstructorStatCard
          label="Rating"
          value={avgRating ? avgRating.toFixed(1) : '—'}
          sub={`${apiData?.overview?.reviewCount ?? 0} approved reviews`}
          icon={<LuStar className="h-5 w-5" />}
        />
        <InstructorStatCard
          label="Classes This Week"
          value={upcoming.filter((c) => {
            const t = new Date(c.scheduledAt).getTime();
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return t >= start.getTime() && t < end.getTime();
          }).length}
          sub={`${todayClasses.length} today`}
          icon={<LuCalendar className="h-5 w-5" />}
        />
      </div>

      <div>
        <InstructorSectionLabel href="/instructor/schedule" linkLabel="Full schedule →">
          This Week&apos;s Classes
        </InstructorSectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((d) => {
            const key = d.toDateString();
            const items = weekMap.get(key) ?? [];
            const isToday = key === todayIso;
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[110px] rounded-2xl border p-3',
                  isToday
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card',
                )}
              >
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {d.toLocaleDateString([], { weekday: 'short' })}
                </div>
                <div className="mb-2 text-lg font-bold">{d.getDate()}</div>
                <div className="space-y-1.5">
                  {items.slice(0, 2).map((c) => (
                    <Link
                      key={c._id}
                      href={`/instructor/materials?batchId=${c.batchId}`}
                      className="block rounded-lg bg-primary px-2 py-1.5 text-[11px] text-primary-foreground"
                    >
                      <div className="font-semibold opacity-90">
                        {formatTime(c.scheduledAt)}
                      </div>
                      <div className="truncate">{c.title}</div>
                    </Link>
                  ))}
                  {items.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground">—</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <InstructorCard title="Today's Classes" href="/instructor/schedule">
          {todayClasses.length === 0 ? (
            <InstructorEmptyState message="No classes scheduled today" />
          ) : (
            <div className="divide-y divide-border">
              {todayClasses.map((c) => {
                const now = Date.now();
                const t = new Date(c.scheduledAt).getTime();
                const isLive = t <= now && t > now - 90 * 60 * 1000;
                return (
                  <div key={c._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-[48px] text-center">
                      <div className="text-xs font-semibold">{formatTime(c.scheduledAt)}</div>
                    </div>
                    <div
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        isLive ? 'bg-red-500' : 'bg-primary',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {c.title}
                        {isLive ? (
                          <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Live
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.batchName}
                      </div>
                    </div>
                    <Link
                      href={`/instructor/materials?batchId=${c.batchId}`}
                      className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                    >
                      Materials
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </InstructorCard>

        <div className="space-y-4">
          <InstructorCard title="Earnings" href="/instructor/payments" linkLabel="Details →">
            <div className="text-2xl font-bold text-primary">
              {formatBdt(apiData?.overview?.totalRevenue ?? 0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {apiData?.overview?.successfulPayments ?? 0} successful payments · all time
            </p>
          </InstructorCard>
          <InstructorCard title="Batches" href="/instructor/batches" linkLabel="View →">
            <div className="text-2xl font-bold">
              {apiData?.batchSummary?.totalBatches ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Active teaching sections across live courses
            </p>
          </InstructorCard>
          <InstructorCard title="Recent enrollments" href="/instructor/enrollments">
            {(apiData?.recentEnrollments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent enrollments</p>
            ) : (
              <div className="space-y-2">
                {(apiData?.recentEnrollments ?? []).slice(0, 3).map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {(e.studentName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{e.studentName}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {e.courseTitle}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InstructorCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <InstructorCard title="My Courses" href="/instructor/courses" linkLabel="Manage →">
          {(apiData?.courses ?? []).length === 0 ? (
            <InstructorEmptyState
              message="No courses yet"
              action={
                <Link
                  href="/instructor/courses/create"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Create your first course
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={courseTypeTab === 'live' ? 'default' : 'outline'}
                  onClick={() => setCourseTypeTab('live')}
                  className="gap-2 rounded-full data-[variant=default]:bg-emerald-700"
                >
                  <LuCalendar className="h-4 w-4" />
                  Live
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={courseTypeTab === 'recorded' ? 'default' : 'outline'}
                  onClick={() => setCourseTypeTab('recorded')}
                  className="gap-2 rounded-full data-[variant=default]:bg-emerald-700"
                >
                  <LuBookOpen className="h-4 w-4" />
                  Recorded
                </Button>
              </div>

              {visibleCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No {courseTypeTab} courses yet.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {visibleCourses.slice(0, 6).map((course) => (
                      <Link
                        key={course._id}
                        href={instructorDashboardCoursePickerHref(course, courseTypeTab)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        {course.title}
                      </Link>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {visibleCourses.slice(0, 3).map((course) => (
                      <div
                        key={course._id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <LuBookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {course.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {courseTypeTab === 'live' ? 'Live' : 'Recorded'} ·{' '}
                            {course.studentCount ?? 0} students
                            {course.category?.name ? ` · ${course.category.name}` : ''}
                          </div>
                        </div>
                        <Link
                          href={instructorDashboardCourseHref(course, courseTypeTab)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {courseTypeTab === 'live' ? 'Manage →' : 'Edit →'}
                        </Link>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </InstructorCard>

        <div className="space-y-4">
          <InstructorCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/instructor/courses/create', label: 'New course' },
                { href: '/instructor/materials', label: 'Lesson Manager' },
                { href: '/instructor/assignments', label: 'Assignments' },
                { href: '/instructor/tests', label: 'Test Creator' },
                { href: '/instructor/students', label: 'Students' },
                { href: '/instructor/schedule', label: 'Schedule' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </InstructorCard>
          <InstructorCard title="Notice Board" href="/instructor/notice-board">
            <p className="text-sm text-muted-foreground">
              Post updates for your batches and keep students informed.
            </p>
          </InstructorCard>
        </div>
      </div>
    </InstructorPage>
  );
}
