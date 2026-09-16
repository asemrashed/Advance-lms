'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuPlus as Plus,
  LuSearch as Search,
} from 'react-icons/lu';
import ExamModal from '@/components/ExamModal';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import {
  InstructorEmptyState,
  InstructorFilterTabs,
  InstructorLoadingState,
  InstructorPage,
  InstructorStatusBadge,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmModal from '@/components/ui/confirm-modal';
import { examsStaffService } from '@/services/examsStaffService';
import { coursesStaffService } from '@/services/coursesStaffService';
import { batchesService, type BatchRecord } from '@/services/batchesService';
import { useSubjects } from '@/hooks/useSubjects';
import { BATCH_GRADES } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';
import type { Exam, ExamStats } from '@/types/exam';

type ExamViewStatus = 'scheduled' | 'completed' | 'draft';
type CourseOption = {
  _id: string;
  title: string;
  courseType?: string;
};

function getExamViewStatus(exam: Exam): ExamViewStatus {
  if (exam.status === 'draft' || !exam.isPublished) return 'draft';
  if (
    exam.status === 'expired' ||
    (exam.endDate && new Date(String(exam.endDate)).getTime() < Date.now())
  ) {
    return 'completed';
  }
  return 'scheduled';
}

function formatExamDate(value?: Date | string) {
  if (!value) return 'Not scheduled yet';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function getCourseTitle(exam: Exam) {
  const course = exam.course as unknown;
  if (course && typeof course === 'object' && 'title' in course) {
    return String((course as { title?: unknown }).title || 'Course');
  }
  return 'All course students';
}

function InstructorExamsPageContent() {
  const router = useRouter();
  const { subjects } = useSubjects({ limit: 200, isActive: true, sortBy: 'name' });
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ExamViewStatus>('all');
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('all');
  const [batch, setBatch] = useState('all');
  const [grade, setGrade] = useState('all');
  const [subject, setSubject] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedCourse = courses.find((c) => c._id === course);
  const isLiveCourse = selectedCourse?.courseType === 'live';
  const courseBatches = useMemo(
    () => (course === 'all' ? [] : batches.filter((b) => b.courseId === course)),
    [batches, course],
  );

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '500',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (search.trim()) queryParams.set('search', search.trim());
      if (course !== 'all') queryParams.set('course', course);
      if (batch !== 'all') queryParams.set('batch', batch);
      if (grade !== 'all') queryParams.set('grade', grade);
      if (subject !== 'all') queryParams.set('subject', subject);

      const response = await examsStaffService.listInstructorExams(queryParams.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch exams');
      }

      const nextExams = data.data?.exams || data.exams || [];
      setExams(Array.isArray(nextExams) ? nextExams : []);
      setStats(data.data?.stats || data.stats || null);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setExams([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [batch, course, grade, search, subject]);

  useEffect(() => {
    void fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    void (async () => {
      try {
        const [coursesRes, batchesRes] = await Promise.all([
          coursesStaffService.listInstructorCourses(),
          batchesService.listBatches('limit=200'),
        ]);
        const coursesData = await coursesRes.json();
        if (coursesRes.ok) {
          setCourses(coursesData.data?.courses || coursesData.courses || []);
        }
        if (batchesRes.success && batchesRes.data?.batches) {
          setBatches(batchesRes.data.batches);
        }
      } catch (error) {
        console.error('Error loading exam filter options:', error);
      }
    })();
  }, []);

  const statusCounts = useMemo(
    () =>
      exams.reduce(
        (counts, exam) => {
          counts[getExamViewStatus(exam)] += 1;
          return counts;
        },
        { scheduled: 0, completed: 0, draft: 0 },
      ),
    [exams],
  );

  const visibleExams = useMemo(
    () =>
      statusFilter === 'all'
        ? exams
        : exams.filter((exam) => getExamViewStatus(exam) === statusFilter),
    [exams, statusFilter],
  );

  const handleAddExam = () => {
    setEditingExam(null);
    setShowForm(true);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingExam(null);
  };

  const handleExamSaved = (saved: Exam) => {
    const wasCreate = !editingExam;
    closeForm();
    if (wasCreate && saved?._id) {
      router.push(`/instructor/exams/${saved._id}/questions?setup=1`);
      return;
    }
    void fetchExams();
  };

  const handleDeleteExam = (exam: Exam) => {
    setExamToDelete(exam);
    setShowDeleteModal(true);
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    setDeleting(true);
    try {
      const response = await examsStaffService.deleteInstructorExam(examToDelete._id);
      if (response.ok) {
        setShowDeleteModal(false);
        setExamToDelete(null);
        await fetchExams();
      } else {
        const data = await response.json();
        console.error('Failed to delete exam:', data.error);
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="Exams"
          subtitle="Scheduled, multi-topic assessments across your course"
          actions={
            <Button onClick={handleAddExam} className="gap-2 rounded-full">
              <Plus className="h-4 w-4" />
              Create Exam
            </Button>
          }
        />

        <section className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-sm leading-6 text-foreground sm:px-5">
          <span className="mt-0.5 text-lg" aria-hidden>
            💡
          </span>
          <p>
            <strong>Exams vs Tests vs Assignments:</strong> Tests are quick, single-topic
            practice quizzes. Assignments are per-lesson homework. <strong>Exams</strong> are
            larger, scheduled events that cover multiple topics at a fixed date and time.
          </p>
        </section>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <InstructorFilterTabs
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as 'all' | ExamViewStatus)}
            tabs={[
              { id: 'all', label: 'All', count: exams.length },
              { id: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled },
              { id: 'completed', label: 'Completed', count: statusCounts.completed },
              { id: 'draft', label: 'Draft', count: statusCounts.draft },
            ]}
          />
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
            <select
              value={course}
              onChange={(event) => {
                setCourse(event.target.value);
                setBatch('all');
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Filter by course"
            >
              <option value="all">All courses</option>
              {courses.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.title}
                </option>
              ))}
            </select>
            {isLiveCourse && courseBatches.length > 0 ? (
              <select
                value={batch}
                onChange={(event) => setBatch(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                aria-label="Filter by batch"
              >
                <option value="all">All batches</option>
                {courseBatches.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Filter by grade"
            >
              <option value="all">All grades</option>
              {BATCH_GRADES.map((g) => (
                <option key={g} value={g}>
                  {formatGradeLabel(g)}
                </option>
              ))}
            </select>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Filter by subject"
            >
              <option value="all">All subjects</option>
              {subjects.map((item) => (
                <option key={item._id} value={item.name}>
                  {item.name}
                  {item.code ? ` (${item.code})` : ''}
                </option>
              ))}
            </select>
            <div className="relative w-full lg:ml-auto lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search exams..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <InstructorLoadingState label="Loading exams…" />
        ) : visibleExams.length === 0 ? (
          <InstructorEmptyState
            message={
              statusFilter === 'all'
                ? 'No exams match these filters.'
                : `No ${statusFilter} exams.`
            }
            action={
              statusFilter === 'all' ? (
                <Button onClick={handleAddExam} size="sm">
                  Create Exam
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleExams.map((exam) => {
              const viewStatus = getExamViewStatus(exam);
              const isCompleted = viewStatus === 'completed';
              const questionCount = exam.questionCount ?? exam.questions?.length ?? 0;
              const cardStats = isCompleted
                ? [
                    { value: `${Math.round(stats?.averageScore ?? 0)}%`, label: 'Avg Score' },
                    { value: String(exam.attempts ?? 0), label: 'Attempts' },
                    { value: String(exam.totalMarks), label: 'Total Marks' },
                    { value: String(exam.passingMarks), label: 'Pass Mark' },
                  ]
                : [
                    { value: String(questionCount), label: 'Questions' },
                    { value: String(exam.totalMarks), label: 'Total Marks' },
                    { value: formatDuration(exam.duration), label: 'Duration' },
                    { value: String(exam.attempts ?? 0), label: 'Attempts' },
                  ];

              return (
                <article
                  key={exam._id}
                  className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3 px-4 py-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-xl text-primary">
                      <span aria-hidden>
                        {exam.type === 'written' ? '✏️' : exam.type === 'mixed' ? '∑' : '📐'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-extrabold tracking-tight sm:text-base">
                          {exam.title}
                        </h2>
                        <InstructorStatusBadge
                          status={
                            viewStatus === 'completed'
                              ? 'success'
                              : viewStatus === 'draft'
                                ? 'draft'
                                : 'info'
                          }
                          label={
                            viewStatus === 'completed'
                              ? 'Completed'
                              : viewStatus === 'draft'
                                ? 'Draft'
                                : 'Scheduled'
                          }
                        />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {viewStatus === 'draft'
                          ? 'Not scheduled yet'
                          : formatExamDate(exam.startDate)}
                        {' · '}
                        {getCourseTitle(exam)}
                      </p>
                    </div>
                  </div>

                  {viewStatus !== 'draft' ? (
                    <div className="grid grid-cols-2 border-y border-border bg-muted/35">
                      {cardStats.map((item) => (
                        <div
                          key={item.label}
                          className="border-b border-r border-border px-2 py-2.5 text-center odd:last:border-r-0 [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0"
                        >
                          <div className="text-base font-extrabold text-primary">{item.value}</div>
                          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 border-y border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                      Finish setup to schedule this exam.
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 px-4 py-4">
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        viewStatus === 'draft'
                          ? router.push(`/instructor/exams/${exam._id}/questions?setup=1`)
                          : handleEditExam(exam)
                      }
                    >
                      {viewStatus === 'draft' ? 'Continue Setup' : 'Edit Exam'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() =>
                        router.push(`/instructor/exams/${exam._id}/questions`)
                      }
                    >
                      Manage Questions
                    </Button>
                    {viewStatus !== 'draft' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() =>
                          router.push(`/instructor/exams/${exam._id}/attempts`)
                        }
                      >
                        {isCompleted ? 'View Results' : 'View Attempts'}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-destructive hover:text-destructive"
                      onClick={() => handleDeleteExam(exam)}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Button
            onClick={handleAddExam}
            size="lg"
            className="h-14 w-14 rounded-full p-0 shadow-lg"
            aria-label="Schedule exam"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        <ExamModal
          open={showForm}
          exam={editingExam}
          onClose={closeForm}
          onSuccess={handleExamSaved}
        />

        <ConfirmModal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setExamToDelete(null);
          }}
          onConfirm={confirmDeleteExam}
          title="Delete Exam"
          description={`Are you sure you want to delete "${examToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete Exam"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </InstructorPage>
    </InstructorRoleShell>
  );
}

export default function InstructorExamsPage() {
  return (
    <InstructorPageWrapper>
      <InstructorExamsPageContent />
    </InstructorPageWrapper>
  );
}
