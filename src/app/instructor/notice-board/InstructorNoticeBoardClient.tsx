'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorLoadingState,
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { noticesService } from '@/services/noticesService';
import { coursesStaffService } from '@/services/coursesStaffService';
import { studentsStaffService } from '@/services/studentsStaffService';
import { enrollmentsStaffService } from '@/services/enrollmentsStaffService';
import { cn } from '@/lib/cn';
import type { NoticeRow } from '@/types/notice';
import {
  LuEye,
  LuMessageSquare,
  LuPencil,
  LuPin,
  LuTrash2,
} from 'react-icons/lu';

type CourseOption = { _id: string; title: string };

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateString).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function InstructorNoticeBoardClient() {
  const { data: session } = useSession();
  const instructorName = session?.user?.name || 'Instructor';
  const avatarLetter = instructorName.charAt(0).toUpperCase();

  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseStudentCounts, setCourseStudentCounts] = useState<
    Map<string, number>
  >(new Map());
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  const [composerBody, setComposerBody] = useState('');
  const [targetCourseId, setTargetCourseId] = useState(''); // '' = all courses
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadNotices = useCallback(async () => {
    const { notices: rows } = await noticesService.list(
      'category=teacher&limit=30&page=1',
    );
    setNotices(rows);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [, coursesRes, studentsRes, enrollRes] = await Promise.all([
          loadNotices(),
          coursesStaffService.listInstructorCourses(100),
          studentsStaffService.listInstructorStudents('limit=1'),
          enrollmentsStaffService.listInstructorEnrollments('limit=100'),
        ]);
        const coursesData = await coursesRes.json();
        setCourses(
          ((coursesData?.data?.courses ?? []) as CourseOption[]).map((c) => ({
            _id: c._id,
            title: c.title,
          })),
        );
        const studentsData = await studentsRes.json();
        setTotalStudents(Number(studentsData?.stats?.totalStudents ?? 0));
        const enrollData = await enrollRes.json();
        const counts = new Map<string, Set<string>>();
        for (const row of enrollData?.data?.enrollments ?? []) {
          // `course`/`student` are plain id strings in this API's mapping.
          const courseId = String(row?.course ?? '');
          const studentId = String(row?.student ?? '');
          if (!courseId || !studentId) continue;
          if (!counts.has(courseId)) counts.set(courseId, new Set());
          counts.get(courseId)!.add(studentId);
        }
        setCourseStudentCounts(
          new Map([...counts.entries()].map(([k, v]) => [k, v.size])),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadNotices]);

  const postNotice = async () => {
    const body = composerBody.trim();
    if (!body) return;
    setPosting(true);
    setPostError(null);
    try {
      const title = body.length > 80 ? `${body.slice(0, 77)}…` : body;
      const { res, error } = await noticesService.create({
        title,
        body,
        category: 'teacher',
        ...(targetCourseId ? { courseId: targetCourseId } : {}),
      });
      if (!res.ok) {
        setPostError(error || 'Failed to post notice');
        return;
      }
      setComposerBody('');
      await loadNotices();
    } finally {
      setPosting(false);
    }
  };

  const togglePin = async (notice: NoticeRow) => {
    const { res } = await noticesService.update(notice._id, {
      isPinned: !notice.isPinned,
    });
    if (res.ok) await loadNotices();
  };

  const removeNotice = async (notice: NoticeRow) => {
    if (!window.confirm('Delete this notice?')) return;
    const ok = await noticesService.remove(notice._id);
    if (ok) await loadNotices();
  };

  const startEdit = (notice: NoticeRow) => {
    setEditingId(notice._id);
    setEditBody(notice.body);
  };

  const saveEdit = async (notice: NoticeRow) => {
    const body = editBody.trim();
    if (!body) return;
    setSavingEdit(true);
    try {
      const title = body.length > 80 ? `${body.slice(0, 77)}…` : body;
      const { res } = await noticesService.update(notice._id, { title, body });
      if (res.ok) {
        setEditingId(null);
        await loadNotices();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const engagement = useMemo(() => {
    const topViewed = [...notices].sort(
      (a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0),
    )[0];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const commentsThisWeek = notices.reduce(
      (sum, n) =>
        sum +
        (n.comments ?? []).filter(
          (c) => new Date(c.createdAt).getTime() >= weekAgo,
        ).length,
      0,
    );
    const pinnedCount = notices.filter((n) => n.isPinned).length;
    return { topViewed, commentsThisWeek, pinnedCount };
  }, [notices]);

  const targetLabel = (notice: NoticeRow) =>
    notice.course?.title || notice.batch?.name || 'All Courses';

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="Notice Board"
          subtitle="Post announcements to your students"
        />

        {loading ? (
          <InstructorLoadingState label="Loading notices…" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-4">
              {/* Composer */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-extrabold text-on-primary-container">
                    {avatarLetter}
                  </div>
                  <textarea
                    rows={3}
                    value={composerBody}
                    onChange={(e) => setComposerBody(e.target.value)}
                    placeholder="Post an announcement to your students…"
                    className="w-full resize-y rounded-xl border border-border bg-muted/10 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetCourseId('')}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-bold transition-colors',
                        targetCourseId === ''
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
                      )}
                    >
                      All Courses
                    </button>
                    {courses.map((course) => (
                      <button
                        key={course._id}
                        type="button"
                        onClick={() => setTargetCourseId(course._id)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-[11px] font-bold transition-colors',
                          targetCourseId === course._id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
                        )}
                      >
                        {course.title}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={postNotice}
                    disabled={posting || !composerBody.trim()}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    📣 {posting ? 'Posting…' : 'Post Notice'}
                  </button>
                </div>
                {postError ? (
                  <p className="mt-2 text-xs text-destructive">{postError}</p>
                ) : null}
              </div>

              {/* Feed */}
              {notices.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                  No notices yet — post your first announcement above.
                </p>
              ) : (
                notices.map((notice) => (
                  <article
                    key={notice._id}
                    className={cn(
                      'rounded-2xl border bg-card p-4',
                      notice.isPinned
                        ? 'border-primary bg-primary-container/40'
                        : 'border-border',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-extrabold text-on-primary-container">
                        {(notice.postedBy?.name || instructorName)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold">
                          {notice.postedBy?.name || instructorName}
                          {notice.isPinned ? ' 📌 Pinned' : ''}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {timeAgo(notice.createdAt)} · {targetLabel(notice)}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                        {targetLabel(notice)}
                      </span>
                    </div>

                    {editingId === notice._id ? (
                      <div className="mt-3">
                        <textarea
                          rows={3}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full resize-y rounded-xl border border-border bg-muted/10 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold hover:border-primary hover:text-primary"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingEdit || !editBody.trim()}
                            onClick={() => saveEdit(notice)}
                            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                          >
                            {savingEdit ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                        {notice.body}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <LuEye className="h-3.5 w-3.5" />
                        {notice.viewCount ?? 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <LuMessageSquare className="h-3.5 w-3.5" />
                        {notice.commentCount ?? 0} comments
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          title={notice.isPinned ? 'Unpin' : 'Pin'}
                          onClick={() => togglePin(notice)}
                          className={cn(
                            'rounded-full p-1.5 transition-colors hover:bg-muted',
                            notice.isPinned
                              ? 'text-primary'
                              : 'text-muted-foreground',
                          )}
                        >
                          <LuPin className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => startEdit(notice)}
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                        >
                          <LuPencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => removeNotice(notice)}
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <LuTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>

                    {(notice.comments ?? []).length > 0 ? (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {(notice.comments ?? []).slice(-3).map((comment, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-extrabold text-muted-foreground">
                              {(comment.author?.name || '?')
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold">
                                {comment.author?.name || 'Student'}
                              </span>{' '}
                              <span className="text-[11px] text-muted-foreground">
                                {comment.body}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </section>

            {/* Right panel */}
            <div className="space-y-4">
              <section className="rounded-2xl border border-border bg-card p-4">
                <h4 className="text-sm font-extrabold">Audience Reach</h4>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Total Students
                    </span>
                    <span className="font-extrabold">{totalStudents}</span>
                  </div>
                  {courses.map((course) => (
                    <div
                      key={course._id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate pr-2 text-muted-foreground">
                        {course.title}
                      </span>
                      <span className="font-extrabold">
                        {courseStudentCounts.get(course._id) ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h4 className="text-sm font-extrabold">Recent Engagement</h4>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  {engagement.topViewed ? (
                    <div className="rounded-xl bg-muted/20 px-3 py-2">
                      🔥 {engagement.topViewed.viewCount ?? 0} views on “
                      {engagement.topViewed.title.length > 34
                        ? `${engagement.topViewed.title.slice(0, 31)}…`
                        : engagement.topViewed.title}
                      ”
                    </div>
                  ) : null}
                  <div className="rounded-xl bg-muted/20 px-3 py-2">
                    💬 {engagement.commentsThisWeek} comments this week
                  </div>
                  <div className="rounded-xl bg-muted/20 px-3 py-2">
                    📌 {engagement.pinnedCount} pinned notice
                    {engagement.pinnedCount === 1 ? '' : 's'} active
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </InstructorPage>
    </InstructorRoleShell>
  );
}
