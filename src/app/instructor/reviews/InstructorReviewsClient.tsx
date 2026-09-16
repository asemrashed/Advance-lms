'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LuCheck,
  LuEye,
  LuEyeOff,
  LuMessageCircle,
  LuSearch,
  LuStar,
  LuTrash2,
} from 'react-icons/lu';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmModal from '@/components/ui/confirm-modal';
import { courseReviewService } from '@/services/courseReviewService';
import { coursesStaffService } from '@/services/coursesStaffService';
import type { CourseReview } from '@/types/course-review';
import {
  InstructorCard,
  InstructorEmptyState,
  InstructorLoadingState,
  InstructorPage,
  InstructorStatusBadge,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';

type CourseOpt = { _id: string; title: string };

const courseIdOf = (r: CourseReview) =>
  typeof r.course === 'string' ? r.course : r.course._id;
const courseTitleOf = (r: CourseReview) =>
  typeof r.course === 'string' ? 'Course' : r.course.title;
const studentNameOf = (r: CourseReview) =>
  r.displayStudentName ||
  r.student?.name || '' ||
  'Student';

function ReviewsContent() {
  const [rows, setRows] = useState<CourseReview[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('all');
  const [rating, setRating] = useState('all');
  const [busy, setBusy] = useState('');
  const [del, setDel] = useState<CourseReview | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const cr = await coursesStaffService.listInstructorCourses(100);
      const cj = await cr.json();
      if (!cr.ok) throw new Error(cj.error || 'Failed to load courses');
      const cs = (cj.data?.courses || []) as CourseOpt[];
      setCourses(cs);
      const rr = await courseReviewService.listAdminReviewsAll();
      const rj = await rr.json();
      if (!rr.ok) throw new Error(rj.error || 'Failed to load reviews');
      const allowed = new Set(cs.map((c) => c._id));
      setRows(
        ((rj.data?.reviews || []) as CourseReview[]).filter((r) =>
          allowed.has(courseIdOf(r)),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(
    () =>
      rows.filter((r) => {
        if (course !== 'all' && courseIdOf(r) !== course) return false;
        if (rating !== 'all' && r.rating !== Number(rating)) return false;
        const hay = `${studentNameOf(r)} ${courseTitleOf(r)} ${r.title || ''} ${r.comment || ''} ${r.instructorReply || ''}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      }),
    [course, rating, rows, search],
  );

  const avg = rows.length
    ? rows.reduce((s, r) => s + r.rating, 0) / rows.length
    : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({
    n,
    c: rows.filter((r) => r.rating === n).length,
  }));

  const moderate = async (r: CourseReview, action: string) => {
    try {
      setBusy(r._id);
      const x = await courseReviewService.updateAdminReview(r._id, { action });
      const j = await x.json();
      if (!x.ok) throw new Error(j.error || 'Update failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy('');
    }
  };

  const submitReply = async (r: CourseReview) => {
    if (!replyText.trim()) return;
    try {
      setBusy(r._id);
      const x = await courseReviewService.updateAdminReview(r._id, {
        action: 'reply',
        reply: replyText.trim(),
      });
      const j = await x.json();
      if (!x.ok) throw new Error(j.error || 'Failed to save reply');
      setReplyFor(null);
      setReplyText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save reply');
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (!del) return;
    try {
      setBusy(del._id);
      const x = await courseReviewService.deleteAdminReview(del._id);
      const j = await x.json();
      if (!x.ok) throw new Error(j.error || 'Delete failed');
      setDel(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-5">
          <InstructorCard title="Rating Summary">
            <div className="text-center">
              <div className="text-5xl font-black text-primary">
                {avg.toFixed(1)}
              </div>
              <div className="mt-2 text-xl text-amber-400">
                {'★'.repeat(Math.round(avg))}
                {'☆'.repeat(5 - Math.round(avg))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Based on {rows.length} reviews
              </p>
            </div>
          </InstructorCard>
          <InstructorCard title="Rating Distribution">
            <div className="space-y-3">
              {dist.map((x) => (
                <button
                  key={x.n}
                  type="button"
                  onClick={() =>
                    setRating(rating === String(x.n) ? 'all' : String(x.n))
                  }
                  className="grid w-full grid-cols-[32px_1fr_24px] items-center gap-2 text-xs"
                >
                  <b>{x.n} ★</b>
                  <span className="h-2 rounded bg-muted">
                    <span
                      className="block h-full rounded bg-primary"
                      style={{
                        width: `${rows.length ? (x.c / rows.length) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span>{x.c}</span>
                </button>
              ))}
            </div>
          </InstructorCard>
        </div>

        <InstructorCard
          title="Student Reviews"
          actions={
            <span className="text-xs text-muted-foreground">
              {shown.length} shown
            </span>
          }
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_120px]">
            <div className="relative">
              <LuSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reviews"
              />
            </div>
            <select
              className="rounded-md border bg-background px-3 text-sm"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="all">All courses</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border bg-background px-3 text-sm"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            >
              <option value="all">All ratings</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <InstructorLoadingState />
          ) : !shown.length ? (
            <InstructorEmptyState message="No reviews match these filters." />
          ) : (
            <div className="space-y-4">
              {shown.map((r) => (
                <article key={r._id} className="rounded-2xl border p-5">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-bold">
                        {studentNameOf(r)}
                        {r.isApproved ? (
                          <InstructorStatusBadge
                            status="success"
                            label="Approved"
                          />
                        ) : (
                          <InstructorStatusBadge
                            status="warning"
                            label="Pending"
                          />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-primary">
                        {courseTitleOf(r)}
                      </span>
                    </div>
                    <div className="text-right text-amber-400">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <LuStar
                          key={n}
                          className="inline h-4 w-4"
                          fill={n <= r.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                  </div>
                  {r.title ? (
                    <h4 className="mt-4 font-bold">{r.title}</h4>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {r.comment || 'Video review'}
                  </p>
                  {r.instructorReply ? (
                    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
                        Your reply
                      </div>
                      {r.instructorReply}
                    </div>
                  ) : null}
                  {replyFor === r._id ? (
                    <div className="mt-3 space-y-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a public reply…"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy === r._id || !replyText.trim()}
                          onClick={() => void submitReply(r)}
                        >
                          Save reply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyFor(null);
                            setReplyText('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                    {!r.isApproved ? (
                      <Button
                        size="sm"
                        disabled={busy === r._id}
                        onClick={() => void moderate(r, 'approve')}
                      >
                        <LuCheck className="mr-1" />
                        Approve
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r._id}
                      onClick={() =>
                        void moderate(
                          r,
                          r.isPublic ? 'make_private' : 'make_public',
                        )
                      }
                    >
                      {r.isPublic ? (
                        <LuEyeOff className="mr-1" />
                      ) : (
                        <LuEye className="mr-1" />
                      )}
                      {r.isPublic ? 'Hide' : 'Show'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r._id}
                      onClick={() => {
                        setReplyFor(r._id);
                        setReplyText(r.instructorReply || '');
                      }}
                    >
                      <LuMessageCircle className="mr-1" />
                      Reply
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-red-600"
                      onClick={() => setDel(r)}
                    >
                      <LuTrash2 className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </InstructorCard>
      </div>

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title="Delete Review"
        description="Delete this review permanently?"
        confirmText="Delete Review"
        cancelText="Cancel"
        variant="danger"
        loading={!!busy}
      />
    </>
  );
}

export default function InstructorReviewsPage() {
  return (
    <InstructorPageWrapper>
      <InstructorRoleShell>
        <InstructorPage>
          <InstructorTopbar
            title="Reviews"
            subtitle="What students are saying about your courses"
          />
          <ReviewsContent />
        </InstructorPage>
      </InstructorRoleShell>
    </InstructorPageWrapper>
  );
}
