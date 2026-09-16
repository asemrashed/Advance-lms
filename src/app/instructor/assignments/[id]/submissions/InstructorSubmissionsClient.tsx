'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorFilterTabs,
  InstructorLoadingState,
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { PdfSubmissionAnnotator } from '@/components/assignments/PdfSubmissionAnnotator';
import { assignmentsStaffService } from '@/services/assignmentsStaffService';
import { noticesService } from '@/services/noticesService';
import { cn } from '@/lib/cn';
import { resolveUploadSrc } from '@/lib/resolveUploadSrc';
import { toDurablePdfPath } from '@/lib/pdfjsClient';
import type {
  AssignmentSubmission,
  PdfAnnotations,
} from '@/types/assignment';
import {
  LuArrowLeft,
  LuDownload,
  LuFileText,
  LuSend,
} from 'react-icons/lu';

interface AssignmentInfo {
  _id: string;
  title: string;
  description?: string;
  type: string;
  dueDate?: string;
  totalMarks: number;
  course?: { _id: string; title: string };
}

type RosterStudent = { _id: string; name: string; email: string };

type ListEntry =
  | { kind: 'submission'; submission: AssignmentSubmission; student: RosterStudent }
  | { kind: 'missing'; student: RosterStudent };

function studentOf(submission: AssignmentSubmission): RosterStudent {
  const s = submission.student;
  if (s && typeof s === 'object') {
    return {
      _id: String(s._id ?? ''),
      name: String(s.name ?? ''),
      email: String(s.email ?? ''),
    };
  }
  return { _id: String(s ?? ''), name: '', email: '' };
}

function timeAgo(dateString?: string) {
  if (!dateString) return '';
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
  });
}

function gradeLetter(score: number, total: number) {
  if (!total || Number.isNaN(score)) return '—';
  const pct = (score / total) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function isReviewed(submission: AssignmentSubmission) {
  return submission.status === 'graded' || submission.status === 'returned';
}

export default function InstructorSubmissionsClient() {
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pdfAnnotations, setPdfAnnotations] = useState<PdfAnnotations | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentRes, submissionsRes] = await Promise.all([
        assignmentsStaffService.getAssignment(assignmentId),
        assignmentsStaffService.listSubmissions(assignmentId, 'limit=200'),
      ]);
      const assignmentData = await assignmentRes.json();
      const submissionsData = await submissionsRes.json();
      const loadedAssignment: AssignmentInfo | null = assignmentRes.ok
        ? (assignmentData.data?.assignment ?? assignmentData.assignment ?? null)
        : null;
      setAssignment(loadedAssignment);
      const rows = submissionsRes.ok
        ? (submissionsData.data?.submissions ??
          submissionsData.submissions ??
          [])
        : [];
      setSubmissions(Array.isArray(rows) ? rows : []);

      const courseId =
        loadedAssignment?.course && typeof loadedAssignment.course === 'object'
          ? loadedAssignment.course._id
          : '';
      if (courseId) {
        const enrollRes = await fetch(
          `/api/instructor/enrollments?course=${courseId}&limit=100`,
          { credentials: 'include' },
        );
        const enrollData = await enrollRes.json();
        const enrollments = (enrollData?.data?.enrollments ?? []) as Array<{
          studentInfo?: {
            _id: string;
            name?: string;
            email?: string;
          };
        }>;
        setRoster(
          enrollments
            .map((e) => e.studentInfo)
            .filter(Boolean)
            .map((s) => ({
              _id: String(s!._id),
              name: s!.name ?? '',
              email: String(s!.email ?? ''),
            })),
        );
      }
    } catch (error) {
      console.error('Failed to load submissions workspace', error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const submittedEntries = useMemo<ListEntry[]>(
    () =>
      submissions
        .filter((s) => s.status !== 'draft')
        .sort(
          (a, b) =>
            new Date(b.submittedAt || 0).getTime() -
            new Date(a.submittedAt || 0).getTime(),
        )
        .map((s) => ({ kind: 'submission', submission: s, student: studentOf(s) })),
    [submissions],
  );

  const missingEntries = useMemo<ListEntry[]>(() => {
    const submittedIds = new Set(
      submissions.map((s) => studentOf(s)._id).filter(Boolean),
    );
    return roster
      .filter((student) => !submittedIds.has(student._id))
      .map((student) => ({ kind: 'missing', student }));
  }, [roster, submissions]);

  const counts = useMemo(() => {
    const reviewed = submittedEntries.filter(
      (e) => e.kind === 'submission' && isReviewed(e.submission),
    ).length;
    return {
      all: submittedEntries.length + missingEntries.length,
      submitted: submittedEntries.length,
      missing: missingEntries.length,
      reviewed,
    };
  }, [submittedEntries, missingEntries]);

  const matchesSearch = useCallback(
    (student: RosterStudent) =>
      !search.trim() ||
      student.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      student.email.toLowerCase().includes(search.trim().toLowerCase()),
    [search],
  );

  const visibleSubmitted = useMemo(
    () =>
      tab === 'missing'
        ? []
        : submittedEntries.filter((e) => {
            if (!matchesSearch(e.student)) return false;
            if (tab === 'reviewed')
              return e.kind === 'submission' && isReviewed(e.submission);
            return true;
          }),
    [submittedEntries, tab, matchesSearch],
  );

  const visibleMissing = useMemo(
    () =>
      tab === 'submitted' || tab === 'reviewed'
        ? []
        : missingEntries.filter((e) => matchesSearch(e.student)),
    [missingEntries, tab, matchesSearch],
  );

  const entryKey = (entry: ListEntry) =>
    entry.kind === 'submission'
      ? `sub-${entry.submission._id}`
      : `miss-${entry.student._id}`;

  const allVisible = [...visibleSubmitted, ...visibleMissing];
  const selectedEntry =
    allVisible.find((e) => entryKey(e) === selectedKey) ?? allVisible[0] ?? null;

  useEffect(() => {
    if (selectedEntry && entryKey(selectedEntry) !== selectedKey) {
      setSelectedKey(entryKey(selectedEntry));
    }
     
  }, [selectedEntry?.kind, selectedEntry ? entryKey(selectedEntry) : '']);

  const selectedSubmission =
    selectedEntry?.kind === 'submission' ? selectedEntry.submission : null;

  useEffect(() => {
    if (!selectedSubmission) {
      setMarks('');
      setFeedback('');
      setPdfAnnotations(null);
      setSaveError(null);
      return;
    }
    setMarks(
      selectedSubmission.score !== undefined
        ? String(selectedSubmission.score)
        : '',
    );
    setFeedback(selectedSubmission.feedback || '');
    setPdfAnnotations(selectedSubmission.pdfAnnotations || null);
    setSaveError(null);
     
  }, [selectedSubmission?._id]);

  const totalMarks = assignment?.totalMarks ?? 0;

  const stats = useMemo(() => {
    const graded = submissions.filter(
      (s) => isReviewed(s) && typeof s.score === 'number',
    );
    const scores = graded.map((s) => Number(s.score));
    const avg =
      scores.length > 0
        ? scores.reduce((sum, v) => sum + v, 0) / scores.length
        : 0;
    return {
      average: scores.length > 0 ? avg : null,
      highest: scores.length > 0 ? Math.max(...scores) : null,
      reviewed: graded.length,
    };
  }, [submissions]);

  const saveGrade = async () => {
    if (!selectedSubmission) return;
    const parsed = Number(marks);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > totalMarks) {
      setSaveError(`Marks must be between 0 and ${totalMarks}.`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await assignmentsStaffService.gradeSubmission(
        assignmentId,
        selectedSubmission._id,
        {
          score: parsed,
          feedback: feedback || undefined,
          ...(pdfAnnotations ? { pdfAnnotations } : {}),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data?.error || 'Failed to save grade.');
        return;
      }
      await fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const notifyMissing = async () => {
    const courseId =
      assignment?.course && typeof assignment.course === 'object'
        ? assignment.course._id
        : '';
    if (!courseId || missingEntries.length === 0) return;
    setNotifying(true);
    try {
      const due = assignment?.dueDate
        ? ` Deadline: ${new Date(assignment.dueDate).toLocaleDateString([], {
            day: 'numeric',
            month: 'long',
          })}.`
        : '';
      const { res } = await noticesService.create({
        title: `Reminder: submit "${assignment?.title ?? 'assignment'}"`,
        body: `You haven't submitted "${assignment?.title ?? 'the assignment'}" yet.${due} Please submit as soon as possible.`,
        category: 'teacher',
        courseId,
      });
      if (res.ok) {
        setNotifyDone(true);
        setTimeout(() => setNotifyDone(false), 2500);
      }
    } finally {
      setNotifying(false);
    }
  };

  const downloadAll = () => {
    for (const submission of submissions) {
      for (const file of submission.files ?? []) {
        const a = document.createElement('a');
        a.href = toDurablePdfPath(file.url) || resolveUploadSrc(file.url);
        a.download = file.name || 'submission-file';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  const exportGrades = () => {
    const header = 'Student,Email,Status,Submitted At,Score,Total,Grade';
    const lines = [
      ...submittedEntries.map((entry) => {
        if (entry.kind !== 'submission') return '';
        const s = entry.submission;
        const student = entry.student;
        const score = typeof s.score === 'number' ? s.score : '';
        return [
          `"${student.name}"`,
          student.email,
          isReviewed(s) ? 'Reviewed' : 'Pending',
          s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '',
          score,
          totalMarks,
          typeof s.score === 'number' ? gradeLetter(s.score, totalMarks) : '',
        ].join(',');
      }),
      ...missingEntries.map((entry) =>
        [
          `"${entry.student.name}"`,
          entry.student.email,
          'Missing',
          '',
          '',
          totalMarks,
          '',
        ].join(','),
      ),
    ].filter(Boolean);
    const blob = new Blob([[header, ...lines].join('\n')], {
      type: 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assignment?.title ?? 'assignment'}-grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const courseTitle =
    assignment?.course && typeof assignment.course === 'object'
      ? assignment.course.title
      : '';

  const selectedPdfFile = selectedSubmission?.files?.find(
    (f) =>
      f.name?.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf',
  );
  const selectedPdfUrl = selectedPdfFile?.url
    ? toDurablePdfPath(selectedPdfFile.url)
    : null;

  const deadlineMeta = assignment?.dueDate
    ? new Date(assignment.dueDate).getTime() > Date.now()
      ? `Deadline ${new Date(assignment.dueDate).toLocaleDateString([], {
          day: 'numeric',
          month: 'short',
        })}`
      : 'Deadline passed'
    : 'No deadline';

  if (loading && !assignment) {
    return (
      <InstructorRoleShell>
        <InstructorPage>
          <InstructorLoadingState label="Loading submissions…" />
        </InstructorPage>
      </InstructorRoleShell>
    );
  }

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="Assignments"
          subtitle={
            assignment
              ? `${assignment.title}${courseTitle ? ` — ${courseTitle}` : ''}`
              : 'Assignment submissions'
          }
          actions={
            <Link
              href="/instructor/assignments"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold transition-colors hover:border-primary hover:text-primary"
            >
              <LuArrowLeft className="h-3.5 w-3.5" />
              All Assignments
            </Link>
          }
        />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <InstructorFilterTabs
            tabs={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'submitted', label: 'Submitted', count: counts.submitted },
              { id: 'missing', label: 'Not Submitted', count: counts.missing },
              { id: 'reviewed', label: 'Reviewed', count: counts.reviewed },
            ]}
            value={tab}
            onChange={setTab}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student…"
            className="w-full max-w-[220px] rounded-[10px] border border-border bg-card px-3.5 py-2 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_260px]">
          {/* LEFT: submissions list */}
          <section className="h-fit overflow-hidden rounded-2xl border border-border bg-card">
            <div className="max-h-[640px] overflow-y-auto p-2">
              {visibleSubmitted.length > 0 ? (
                <div className="px-2 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Submitted
                </div>
              ) : null}
              {visibleSubmitted.map((entry) => {
                if (entry.kind !== 'submission') return null;
                const key = entryKey(entry);
                const active = selectedEntry
                  ? entryKey(selectedEntry) === key
                  : false;
                const reviewed = isReviewed(entry.submission);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                      active
                        ? 'bg-primary-container'
                        : 'hover:bg-muted/40',
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-extrabold text-on-primary-container">
                      {(entry.student.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold">
                        {entry.student.name || entry.student.email}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {timeAgo(entry.submission.submittedAt)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                        reviewed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700',
                      )}
                    >
                      {reviewed ? 'Reviewed' : 'Pending'}
                    </span>
                  </button>
                );
              })}

              {visibleMissing.length > 0 ? (
                <div className="px-2 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Not Submitted
                </div>
              ) : null}
              {visibleMissing.map((entry) => {
                const key = entryKey(entry);
                const active = selectedEntry
                  ? entryKey(selectedEntry) === key
                  : false;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                      active ? 'bg-primary-container' : 'hover:bg-muted/40',
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-extrabold text-red-500">
                      {(entry.student.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold">
                        {entry.student.name || entry.student.email}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {deadlineMeta}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                      Missing
                    </span>
                  </button>
                );
              })}

              {allVisible.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No students match this filter.
                </p>
              ) : null}
            </div>
          </section>

          {/* CENTER: detail */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            {!selectedEntry ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Select a student to review their submission.
              </p>
            ) : selectedEntry.kind === 'missing' ? (
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-base font-extrabold text-red-500">
                    {(selectedEntry.student.name || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="text-base font-extrabold">
                      {selectedEntry.student.name ||
                        selectedEntry.student.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {assignment?.title}
                      {courseTitle ? ` · ${courseTitle}` : ''}
                    </div>
                  </div>
                  <span className="ml-auto rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
                    Missing
                  </span>
                </div>
                <p className="mt-5 text-sm text-muted-foreground">
                  This student hasn&apos;t submitted the assignment yet.{' '}
                  {deadlineMeta}. Use “Notify Missing” to send a reminder to the
                  class.
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-base font-extrabold text-on-primary-container">
                    {(selectedEntry.student.name || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="text-base font-extrabold">
                      {selectedEntry.student.name ||
                        selectedEntry.student.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {assignment?.title}
                      {courseTitle ? ` · ${courseTitle}` : ''}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'ml-auto rounded-full px-3 py-1 text-xs font-bold',
                      isReviewed(selectedEntry.submission)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700',
                    )}
                  >
                    {isReviewed(selectedEntry.submission)
                      ? '✓ Reviewed'
                      : 'Pending Review'}
                  </span>
                </div>

                <div className="space-y-5 p-5">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Submitted
                      </div>
                      <div className="mt-0.5 text-xs font-extrabold">
                        {selectedEntry.submission.submittedAt
                          ? new Date(
                              selectedEntry.submission.submittedAt,
                            ).toLocaleString([], {
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        File
                      </div>
                      {selectedEntry.submission.files?.length ? (
                        <a
                          href={toDurablePdfPath(
                            selectedEntry.submission.files[0].url,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 flex items-center gap-1 truncate text-xs font-extrabold text-primary hover:underline"
                        >
                          <LuFileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {selectedEntry.submission.files[0].name}
                          </span>
                        </a>
                      ) : (
                        <div className="mt-0.5 text-xs font-extrabold">
                          No file
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Status
                      </div>
                      <div className="mt-0.5 text-xs font-extrabold">
                        {selectedEntry.submission.isLate
                          ? 'Late submission'
                          : 'On time ✓'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Late
                      </div>
                      <div className="mt-0.5 text-xs font-extrabold">
                        {selectedEntry.submission.isLate ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>

                  {/* Text answer, if any */}
                  {selectedEntry.submission.content ? (
                    <div className="rounded-xl border border-border bg-muted/10 p-4">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Submission Content
                      </div>
                      <p className="whitespace-pre-wrap text-sm">
                        {selectedEntry.submission.content}
                      </p>
                    </div>
                  ) : null}

                  {/* PDF review with drawing tools */}
                  {selectedPdfUrl ? (
                    <div>
                      <h4 className="mb-2 text-sm font-extrabold">
                        ✏️ PDF Review — draw directly on the submission
                      </h4>
                      <PdfSubmissionAnnotator
                        pdfUrl={selectedPdfUrl}
                        value={pdfAnnotations}
                        onChange={setPdfAnnotations}
                      />
                    </div>
                  ) : null}

                  {/* Marks & feedback */}
                  <div className="rounded-xl border border-border p-4">
                    <h4 className="text-sm font-extrabold">
                      ⭐ Marks &amp; Feedback
                    </h4>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                          Marks
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={totalMarks}
                            value={marks}
                            onChange={(e) => setMarks(e.target.value)}
                            className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm font-bold outline-none transition-colors focus:border-primary"
                          />
                          <span className="shrink-0 text-sm font-bold text-muted-foreground">
                            / {totalMarks}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                          Grade
                        </label>
                        <input
                          disabled
                          value={
                            marks === ''
                              ? '—'
                              : gradeLetter(Number(marks), totalMarks)
                          }
                          className="w-full rounded-[10px] border border-border bg-muted/30 px-3 py-2 text-center text-sm font-extrabold text-primary"
                        />
                      </div>
                    </div>
                    <label className="mb-1 mt-3 block text-[11px] font-bold text-muted-foreground">
                      Feedback to Student
                    </label>
                    <textarea
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Write feedback for the student…"
                      className="w-full resize-y rounded-[10px] border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    />
                    {saveError ? (
                      <p className="mt-1 text-xs text-destructive">
                        {saveError}
                      </p>
                    ) : null}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMarks(
                            selectedEntry.submission.score !== undefined
                              ? String(selectedEntry.submission.score)
                              : '',
                          );
                          setFeedback(selectedEntry.submission.feedback || '');
                          setPdfAnnotations(
                            selectedEntry.submission.pdfAnnotations || null,
                          );
                          setSaveError(null);
                        }}
                        className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold transition-colors hover:border-primary hover:text-primary"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveGrade}
                        disabled={saving || marks === ''}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        💾 {saving ? 'Saving…' : 'Save & Notify Student'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* RIGHT: stats + quick actions */}
          <div className="flex flex-col gap-4">
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-extrabold">📊 Assignment Stats</h3>
              </div>
              <div className="p-4">
                <div className="rounded-xl bg-primary-container px-4 py-3 text-center">
                  <div className="text-2xl font-extrabold text-on-primary-container">
                    {counts.submitted}/{counts.submitted + counts.missing}
                  </div>
                  <div className="text-[11px] font-bold text-muted-foreground">
                    Submitted
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Average Marks</span>
                    <span className="font-extrabold">
                      {stats.average !== null
                        ? `${stats.average.toFixed(1)}/${totalMarks}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Highest</span>
                    <span className="font-extrabold">
                      {stats.highest !== null
                        ? `${stats.highest}/${totalMarks}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Reviewed</span>
                    <span className="font-extrabold">
                      {stats.reviewed} of {counts.submitted}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-extrabold">⚡ Quick Actions</h3>
              </div>
              <div className="space-y-2 p-4">
                <button
                  type="button"
                  onClick={notifyMissing}
                  disabled={notifying || missingEntries.length === 0}
                  className="flex w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2.5 text-xs font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <LuSend className="h-3.5 w-3.5" />
                  {notifyDone
                    ? 'Reminder posted!'
                    : notifying
                      ? 'Posting reminder…'
                      : `Notify Missing (${missingEntries.length})`}
                </button>
                <button
                  type="button"
                  onClick={downloadAll}
                  disabled={counts.submitted === 0}
                  className="flex w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2.5 text-xs font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <LuDownload className="h-3.5 w-3.5" />
                  Download All
                </button>
                <button
                  type="button"
                  onClick={exportGrades}
                  disabled={counts.all === 0}
                  className="flex w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2.5 text-xs font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  📊 Export Grades
                </button>
              </div>
            </section>
          </div>
        </div>
      </InstructorPage>
    </InstructorRoleShell>
  );
}
