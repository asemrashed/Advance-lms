'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/httpClient';
import { formatBdt } from '@/lib/currency';
import { resolveImageSrc } from '@/lib/resolveImageSrc';
import { htmlToPlainText } from '@/lib/utils';
import type { BatchRecord } from '@/services/batchesService';
import type { Chapter } from '@/types/chapter';
import type { Course, CourseCreator } from '@/types/course';
import {
  LuArrowLeft,
  LuBookOpen,
  LuCalendarDays,
  LuCheck,
  LuClock3,
  LuEye,
  LuGraduationCap,
  LuLoader,
  LuTag,
  LuUsers,
  LuX,
} from 'react-icons/lu';

type ReviewData = {
  course: Course;
  batches: BatchRecord[];
  chapters: Chapter[];
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statusLabel(status: Course['status']) {
  if (status === 'pending_approval') return 'Pending approval';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClass(status: Course['status']) {
  if (status === 'published') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'pending_approval') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'archived') return 'border-slate-200 bg-slate-100 text-slate-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

function creator(value?: string | CourseCreator) {
  return value && typeof value !== 'string' ? value : undefined;
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value || '—'}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-4">
        {icon ? <div className="text-primary">{icon}</div> : null}
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AdminCourseReviewClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = params.id;
  const requestId = searchParams.get('requestId') || '';

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const [courseRes, batchesRes, chaptersRes] = await Promise.all([
          apiFetch(`/api/courses/${courseId}`),
          apiFetch(`/api/courses/${courseId}/batches?includeInactive=true`),
          apiFetch(
            `/api/chapters?course=${encodeURIComponent(courseId)}&limit=1000&sortBy=order&sortOrder=asc`,
          ),
        ]);
        const [courseJson, batchesJson, chaptersJson] = await Promise.all([
          courseRes.json(),
          batchesRes.json(),
          chaptersRes.json(),
        ]);
        if (!courseRes.ok || !courseJson?.data) {
          throw new Error(courseJson?.error || 'Failed to load course');
        }
        if (!active) return;
        setData({
          course: courseJson.data as Course,
          batches: batchesRes.ok
            ? ((batchesJson?.data?.batches as BatchRecord[]) || [])
            : [],
          chapters: chaptersRes.ok
            ? ((chaptersJson?.data?.chapters as Chapter[]) || [])
            : [],
        });
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Failed to load review');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [courseId]);

  const review = async (action: 'approve' | 'reject') => {
    if (!requestId) {
      setError('This review link does not include an approval request.');
      return;
    }
    setBusy(action);
    setError('');
    try {
      const response = await apiFetch(`/api/admin/content-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          rejectionNote: action === 'reject' ? rejectionNote : undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result?.error || `Failed to ${action} course`);
        return;
      }
      router.push('/admin/courses?view=requests');
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <AdminRoleShell>
        <div className="relative z-10 flex min-h-72 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <LuLoader className="h-5 w-5 animate-spin" />
          Loading complete course details…
        </div>
      </AdminRoleShell>
    );
  }

  if (!data) {
    return (
      <AdminRoleShell>
        <main className="relative z-10 p-4 sm:p-6">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error || 'Course not found'}
          </div>
        </main>
      </AdminRoleShell>
    );
  }

  const { course, batches, chapters } = data;
  const instructor = creator(course.instructor) || course.instructorInfo;
  const description = htmlToPlainText(course.description || '');
  const shortDescription = htmlToPlainText(course.shortDescription || '');
  const canReview = Boolean(requestId) && course.status === 'pending_approval';

  return (
    <AdminRoleShell>
      <main className="relative z-10 space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={statusClass(course.status)}>
                {statusLabel(course.status)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {course.courseType || 'recorded'} course
              </Badge>
              <Badge variant="outline">Read only</Badge>
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Review course</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Courses → Approval requests → {course.title}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/courses?view=requests">
              <LuArrowLeft className="h-4 w-4" />
              Back to requests
            </Link>
          </Button>
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <Section
              title="Course details"
              subtitle="Information submitted by the instructor"
              icon={<LuBookOpen className="h-5 w-5" />}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Course name" value={course.title} />
                <Detail
                  label="Subject"
                  value={
                    <>
                      {course.subjectName || course.category || '—'}
                      {course.subjectCode ? ` (${course.subjectCode})` : ''}
                    </>
                  }
                />
                <Detail label="Grade" value={course.grade || 'Not specified'} />
                <Detail label="Course type" value={course.courseType || 'Recorded'} />
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Short description
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                    {shortDescription || 'No short description provided.'}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Full description
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                    {description || 'No description provided.'}
                  </p>
                </div>
              </div>
            </Section>

            <Section
              title="Pricing and offering"
              subtitle="Student-facing commercial details"
              icon={<LuTag className="h-5 w-5" />}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Detail label="Access" value={course.isPaid ? 'Paid' : 'Free'} />
                <Detail
                  label="Regular price"
                  value={course.isPaid ? formatBdt(course.price || 0) : 'Free'}
                />
                <Detail
                  label="Sale price"
                  value={
                    course.isPaid && course.salePrice != null
                      ? formatBdt(course.salePrice)
                      : 'Not set'
                  }
                />
              </div>
              {course.features?.length ? (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Included features
                  </h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {course.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {course.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </Section>

            <Section
              title={`Batches (${batches.length})`}
              subtitle="Main batch information linked to this course"
              icon={<LuUsers className="h-5 w-5" />}
            >
              {batches.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  No batches are linked to this course.
                </p>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <article key={batch._id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{batch.name}</h3>
                          {batch.shortDescription ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {batch.shortDescription}
                            </p>
                          ) : null}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            batch.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                          }
                        >
                          {batch.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div className="flex items-center gap-2">
                          <LuCalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(batch.startDate)} – {formatDate(batch.endDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LuUsers className="h-4 w-4 text-muted-foreground" />
                          <span>{batch.enrolledCount || 0}/{batch.maxStudents || '—'} students</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LuGraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span>{batch.grade || course.grade || 'No grade'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LuClock3 className="h-4 w-4 text-muted-foreground" />
                          <span>{batch.schedule?.length || 0} schedule slots</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title={`Curriculum (${chapters.length} chapters)`}
              subtitle="Read-only syllabus structure copied to the course"
              icon={<LuBookOpen className="h-5 w-5" />}
            >
              {chapters.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  No curriculum chapters found.
                </p>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {chapters.map((chapter, index) => (
                    <div key={chapter._id} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{chapter.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {chapter.lessonCount || 0} lessons
                        </div>
                      </div>
                      <Badge variant="outline">
                        {chapter.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              {course.thumbnailUrl ? (
                <img
                  src={resolveImageSrc(course.thumbnailUrl)}
                  alt={course.title}
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-muted/50">
                  <LuBookOpen className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
              <div className="space-y-3 p-5">
                <div className="font-serif text-xl font-bold tracking-tight">{course.title}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {course.subjectName || course.category || 'Uncategorised'}
                  {course.grade ? ` · ${course.grade}` : ''}
                </div>
                <p className="text-sm text-muted-foreground">
                  {shortDescription || description || 'No description provided.'}
                </p>
                <div className="border-t border-border pt-3 text-2xl font-bold text-primary">
                  {course.isPaid ? formatBdt(course.finalPrice ?? course.price ?? 0) : 'Free'}
                </div>
              </div>
            </section>

            <Section title="Instructor and ownership" icon={<LuUsers className="h-5 w-5" />}>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Instructor</div>
                  <div className="font-semibold">{instructor?.name || 'Not assigned'}</div>
                  <div className="text-xs text-muted-foreground">{instructor?.email || '—'}</div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-xs text-muted-foreground">Created by</div>
                  <div className="font-semibold">{course.createdBy?.name || '—'}</div>
                  <div className="text-xs text-muted-foreground">{course.createdBy?.email || '—'}</div>
                </div>
              </div>
            </Section>

            <Section title="Operational details" icon={<LuEye className="h-5 w-5" />}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Detail label="Lessons" value={course.lessonCount || 0} />
                <Detail label="Enrollments" value={course.enrollmentCount || 0} />
                <Detail label="Visibility" value={course.isHidden ? 'Hidden' : 'Visible'} />
                <Detail label="Difficulty" value={course.difficulty || 'Not set'} />
                <Detail label="Duration" value={course.duration ? `${course.duration} min` : 'Not set'} />
                <Detail label="Display order" value={course.displayOrder ?? 'Default'} />
                <Detail label="Created" value={formatDate(course.createdAt)} />
                <Detail label="Last updated" value={formatDate(course.updatedAt)} />
              </div>
            </Section>

            <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card">
              <header className="border-b border-primary/15 bg-primary/5 px-5 py-4">
                <h2 className="text-sm font-semibold text-primary">Admin decision</h2>
                <p className="text-xs text-muted-foreground">
                  Course information is read only. Choose a review outcome below.
                </p>
              </header>
              <div className="space-y-3 p-5">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Rejection note (optional)
                </label>
                <textarea
                  value={rejectionNote}
                  onChange={(event) => setRejectionNote(event.target.value)}
                  disabled={!canReview || busy !== null}
                  rows={3}
                  placeholder="Explain what the instructor needs to change"
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={!canReview || busy !== null}
                    onClick={() => void review('reject')}
                  >
                    {busy === 'reject' ? (
                      <LuLoader className="h-4 w-4 animate-spin" />
                    ) : (
                      <LuX className="h-4 w-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={!canReview || busy !== null}
                    onClick={() => void review('approve')}
                  >
                    {busy === 'approve' ? (
                      <LuLoader className="h-4 w-4 animate-spin" />
                    ) : (
                      <LuCheck className="h-4 w-4" />
                    )}
                    Approve & publish
                  </Button>
                </div>
                {!requestId ? (
                  <p className="text-xs text-destructive">
                    Approval actions are unavailable because no request ID was provided.
                  </p>
                ) : !canReview ? (
                  <p className="text-xs text-muted-foreground">
                    This course is no longer awaiting approval.
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </AdminRoleShell>
  );
}
