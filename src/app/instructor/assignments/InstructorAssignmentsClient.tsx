'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AssignmentModal from '@/components/AssignmentModal';
import ConfirmModal from '@/components/ui/confirm-modal';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Assignment } from '@/types/assignment';
import { assignmentsStaffService } from '@/services/assignmentsStaffService';
import { coursesStaffService } from '@/services/coursesStaffService';
import { batchesService, type BatchRecord } from '@/services/batchesService';
import { useSubjects } from '@/hooks/useSubjects';
import { BATCH_GRADES } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';
import {
  InstructorCard,
  InstructorEmptyState,
  InstructorFilterTabs,
  InstructorLoadingState,
  InstructorPage,
  InstructorStatusBadge,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import {
  LuArrowRight as ArrowRight,
  LuCalendarDays as Calendar,
  LuFileText as FileText,
  LuPencil as Pencil,
  LuPlus as Plus,
  LuSearch as Search,
  LuTrash2 as Trash,
} from 'react-icons/lu';

type AssignmentStatus = 'all' | 'published' | 'draft' | 'active' | 'scheduled' | 'expired';
type CourseOption = {
  _id: string;
  title: string;
  courseType?: string;
};

function courseTitle(assignment: Assignment) {
  return typeof assignment.course === 'object' ? assignment.course.title : 'Course';
}

function displayDate(value?: string) {
  if (!value) return 'No deadline';
  return new Date(value).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function InstructorAssignmentsPageContent() {
  const router = useRouter();
  const { subjects } = useSubjects({ limit: 200, isActive: true, sortBy: 'name' });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>('all');
  const [course, setCourse] = useState('all');
  const [batch, setBatch] = useState('all');
  const [grade, setGrade] = useState('all');
  const [subject, setSubject] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedCourse = courses.find((c) => c._id === course);
  const isLiveCourse = selectedCourse?.courseType === 'live';
  const courseBatches = useMemo(
    () => (course === 'all' ? [] : batches.filter((b) => b.courseId === course)),
    [batches, course],
  );

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: String(page),
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status !== 'all' ? { status } : {}),
        ...(course !== 'all' ? { course } : {}),
        ...(batch !== 'all' ? { batch } : {}),
        ...(grade !== 'all' ? { grade } : {}),
        ...(subject !== 'all' ? { subject } : {}),
      });
      const response = await assignmentsStaffService.listInstructorAssignments(query.toString());
      const data = await response.json();
      if (response.ok) {
        setAssignments(data.data?.assignments || data.assignments || []);
        setPagination(data.data?.pagination || data.pagination || { page: 1, total: 0, pages: 0 });
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAssignments();
  }, [batch, course, grade, page, search, status, subject]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [coursesRes, batchesRes] = await Promise.all([
          coursesStaffService.listInstructorCourses(),
          batchesService.listBatches('limit=200'),
        ]);
        const data = await coursesRes.json();
        if (coursesRes.ok) setCourses(data.data?.courses || data.courses || []);
        if (batchesRes.success && batchesRes.data?.batches) {
          setBatches(batchesRes.data.batches);
        }
      } catch (error) {
        console.error('Error fetching assignment filter options:', error);
      }
    };
    void fetchOptions();
  }, []);

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      setDeleting(true);
      const response = await assignmentsStaffService.deleteAssignment(assignmentToDelete._id);
      if (response.ok) {
        setAssignmentToDelete(null);
        await fetchAssignments();
      } else {
        const data = await response.json().catch(() => null);
        console.error(data?.error || 'Failed to delete assignment');
      }
    } finally {
      setDeleting(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'published', label: 'Published' },
    { id: 'active', label: 'Active' },
    { id: 'draft', label: 'Draft' },
    { id: 'expired', label: 'Expired' },
  ];

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="Assignments"
          subtitle="Create assignments and review student submissions"
          actions={
            <Button onClick={() => {
              setEditingAssignment(null);
              setShowForm(true);
            }} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Create Assignment
            </Button>
          }
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="overflow-x-auto pb-1">
            <InstructorFilterTabs
              tabs={tabs}
              value={status}
              onChange={(id) => {
                setStatus(id as AssignmentStatus);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
            <select
              value={course}
              onChange={(event) => {
                setCourse(event.target.value);
                setBatch('all');
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Filter by course"
            >
              <option value="all">All courses</option>
              {courses.map((item) => (
                <option key={item._id} value={item._id}>{item.title}</option>
              ))}
            </select>
            {isLiveCourse && courseBatches.length > 0 ? (
              <select
                value={batch}
                onChange={(event) => {
                  setBatch(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                aria-label="Filter by batch"
              >
                <option value="all">All batches</option>
                {courseBatches.map((item) => (
                  <option key={item._id} value={item._id}>{item.name}</option>
                ))}
              </select>
            ) : null}
            <select
              value={grade}
              onChange={(event) => {
                setGrade(event.target.value);
                setPage(1);
              }}
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
              onChange={(event) => {
                setSubject(event.target.value);
                setPage(1);
              }}
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
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search assignment..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <InstructorCard
          title="Assignment List"
          actions={
            <span className="text-xs text-muted-foreground">
              {pagination.total} assignment{pagination.total === 1 ? '' : 's'}
            </span>
          }
        >
          {loading ? (
            <InstructorLoadingState label="Loading assignments…" />
          ) : assignments.length === 0 ? (
            <InstructorEmptyState
              message="No assignments match these filters."
              action={<Button size="sm" onClick={() => setShowForm(true)}>Create assignment</Button>}
            />
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => {
                const badgeStatus =
                  assignment.status === 'published' || assignment.status === 'active'
                    ? 'success'
                    : assignment.status === 'expired'
                      ? 'error'
                      : assignment.status === 'scheduled'
                        ? 'info'
                        : 'draft';
                return (
                  <article
                    key={assignment._id}
                    className="group grid gap-4 rounded-xl border border-border p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/30 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-bold text-foreground">{assignment.title}</h3>
                          <InstructorStatusBadge status={badgeStatus} label={assignment.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {courseTitle(assignment)} · {assignment.type.replaceAll('_', ' ')} · {assignment.totalMarks} marks
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Due {displayDate(assignment.dueDate)}
                          </span>
                          <span>{assignment.submissionCount ?? '—'} submissions</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingAssignment(assignment);
                          setShowForm(true);
                        }}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAssignmentToDelete(assignment)}
                        aria-label={`Delete ${assignment.title}`}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/instructor/assignments/${assignment._id}/submissions`)}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Review submissions
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {pagination.pages > 1 ? (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </InstructorCard>

        <AssignmentModal
          open={showForm}
          assignment={editingAssignment}
          onClose={() => {
            setShowForm(false);
            setEditingAssignment(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingAssignment(null);
            void fetchAssignments();
          }}
        />
        <ConfirmModal
          open={Boolean(assignmentToDelete)}
          onClose={() => setAssignmentToDelete(null)}
          onConfirm={confirmDeleteAssignment}
          title="Delete Assignment"
          description={`Are you sure you want to delete "${assignmentToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete Assignment"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </InstructorPage>
    </InstructorRoleShell>
  );
}

export default function InstructorAssignmentsPage() {
  return <InstructorAssignmentsPageContent />;
}
