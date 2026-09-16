'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import WelcomeSection from '@/components/WelcomeSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Assignment, AssignmentSubmission } from '@/types/assignment';
import { studentAssignmentService } from '@/services/studentAssignmentService';
import { RichHtml } from '@/components/ui/MathText';
import {
  LuCalendar,
  LuCheck,
  LuChevronRight,
  LuClock3,
  LuFileText,
  LuSearch,
  LuUpload,
} from 'react-icons/lu';

type AssignmentRow = Assignment & {
  latestSubmission?: AssignmentSubmission;
  attemptsRemaining?: number;
  submissionStatus?: string;
};
type StatusFilter = 'all' | 'due' | 'submitted' | 'graded' | 'overdue';

const assignmentTypes: Array<Assignment['type'] | 'all'> = [
  'all', 'pdf', 'file_upload', 'mcq', 'quiz', 'essay', 'project', 'presentation',
];

function courseTitle(assignment: Assignment) {
  return typeof assignment.course === 'string' ? 'General course' : assignment.course?.title || 'General course';
}

function dueLabel(date?: string) {
  if (!date) return 'No deadline';
  const due = new Date(date);
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `Overdue · ${due.toLocaleDateString()}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function statusOf(assignment: AssignmentRow): StatusFilter {
  if (assignment.latestSubmission?.status === 'graded') return 'graded';
  if (assignment.latestSubmission) return 'submitted';
  if (assignment.dueDate && new Date(assignment.dueDate).getTime() < Date.now()) return 'overdue';
  return 'due';
}

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<(typeof assignmentTypes)[number]>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: '1', limit: '100', sortBy: 'dueDate', sortOrder: 'asc' });
        const response = await studentAssignmentService.listAssignments(params);
        const body = await response.json();
        const rows = (body.data?.assignments || body.assignments || []) as AssignmentRow[];
        setAssignments(rows);
        setSelectedId((current) => current || rows[0]?._id || '');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => assignments.filter((assignment) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      || assignment.title.toLowerCase().includes(query)
      || courseTitle(assignment).toLowerCase().includes(query);
    return matchesSearch
      && (type === 'all' || assignment.type === type)
      && (status === 'all' || statusOf(assignment) === status);
  }), [assignments, search, status, type]);

  useEffect(() => {
    if (!filtered.some((item) => item._id === selectedId)) setSelectedId(filtered[0]?._id || '');
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item._id === selectedId) || filtered[0];
  const counts = useMemo(() => ({
    all: assignments.length,
    due: assignments.filter((item) => statusOf(item) === 'due').length,
    submitted: assignments.filter((item) => statusOf(item) === 'submitted').length,
    graded: assignments.filter((item) => statusOf(item) === 'graded').length,
    overdue: assignments.filter((item) => statusOf(item) === 'overdue').length,
  }), [assignments]);

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-3 sm:p-5">
        <WelcomeSection title="My Assignments" description="Submit work and track feedback" />

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'due', 'submitted', 'graded', 'overdue'] as StatusFilter[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={status === value ? 'default' : 'ghost'}
                onClick={() => setStatus(value)}
                className={status === value ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
              >
                {value === 'due' ? 'Due Soon' : value[0].toUpperCase() + value.slice(1)} ({counts[value]})
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assignments" className="pl-9" />
            </div>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as (typeof assignmentTypes)[number])}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              aria-label="Assignment type"
            >
              {assignmentTypes.map((value) => <option key={value} value={value}>{value === 'all' ? 'All types' : value.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
          <Card className="overflow-hidden border shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No assignments match these filters.</div>
              ) : filtered.map((assignment) => {
                const itemStatus = statusOf(assignment);
                const active = assignment._id === selected?._id;
                return (
                  <button
                    type="button"
                    key={assignment._id}
                    onClick={() => setSelectedId(assignment._id)}
                    className={`flex w-full items-center gap-3 border-b p-4 text-left transition-colors last:border-b-0 ${active ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'hover:bg-muted/50'}`}
                  >
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${itemStatus === 'graded' ? 'bg-emerald-100 text-emerald-700' : itemStatus === 'overdue' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                      {itemStatus === 'graded' ? <LuCheck className="h-5 w-5" /> : <LuClock3 className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{assignment.title}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{courseTitle(assignment)} · {dueLabel(assignment.dueDate)}</span>
                    </span>
                    {assignment.latestSubmission?.score != null ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{assignment.latestSubmission.score}/{assignment.latestSubmission.maxScore}</Badge>
                    ) : <LuChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-0">
              {!selected ? (
                <div className="grid min-h-80 place-items-center p-8 text-muted-foreground">Select an assignment to see its details.</div>
              ) : (
                <>
                  <div className="border-b bg-muted/30 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold">{selected.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{courseTitle(selected)} · {selected.type.replace('_', ' ')}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{statusOf(selected)}</Badge>
                    </div>
                  </div>
                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Deadline</p><p className="mt-1 font-semibold">{dueLabel(selected.dueDate)}</p></div>
                      <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Total marks</p><p className="mt-1 font-semibold">{selected.totalMarks} marks</p></div>
                      <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Attempts left</p><p className="mt-1 font-semibold">{selected.attemptsRemaining ?? selected.maxAttempts}</p></div>
                    </div>

                    {(selected.description || selected.instructions) && (
                      <div>
                        <h3 className="mb-2 font-semibold">Assignment brief</h3>
                        <RichHtml
                          className="prose prose-sm max-w-none leading-6 text-muted-foreground prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5"
                          html={selected.description || selected.instructions || ''}
                        />
                      </div>
                    )}

                    {selected.latestSubmission ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <div className="flex items-center gap-2 font-semibold text-emerald-800"><LuCheck className="h-4 w-4" />Submission {selected.latestSubmission.status}</div>
                        {selected.latestSubmission.submittedAt && <p className="mt-1 text-xs text-emerald-800/80">Submitted {new Date(selected.latestSubmission.submittedAt).toLocaleString()}</p>}
                        {selected.latestSubmission.feedback && <p className="mt-3 border-t border-emerald-200 pt-3 text-sm"><strong>Feedback:</strong> {selected.latestSubmission.feedback}</p>}
                      </div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                        <LuUpload className="mx-auto mb-2 h-8 w-8 text-primary" />
                        <p className="font-semibold">{selected.type === 'pdf' || selected.type === 'file_upload' ? 'Upload your PDF submission' : 'Your response is ready to begin'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Open the submission screen to complete and submit this assignment.</p>
                      </div>
                    )}

                    <Button onClick={() => router.push(`/student/assignments/${selected._id}`)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      {selected.latestSubmission ? <LuFileText className="mr-2 h-4 w-4" /> : <LuUpload className="mr-2 h-4 w-4" />}
                      {selected.latestSubmission ? 'View submission & feedback' : 'Open assignment'}
                    </Button>
                    {selected.dueDate && <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><LuCalendar className="h-3.5 w-3.5" />{new Date(selected.dueDate).toLocaleString()}</p>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </StudentRoleShell>
  );
}
