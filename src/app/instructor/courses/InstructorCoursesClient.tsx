'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import { Course } from '@/types/course';
import { Button } from '@/components/ui/button';
import {
  LuPlus as Plus,
  LuCalendar as Calendar,
  LuBookOpen as BookOpen,
  LuArrowRight as ArrowRight,
} from 'react-icons/lu';
import { coursesStaffService } from '@/services/coursesStaffService';
import { batchesService, type BatchRecord } from '@/services/batchesService';
import ConfirmModal from '@/components/ui/confirm-modal';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorCreateCourseCard,
  InstructorCourseCard,
  InstructorEmptyState,
  InstructorLoadingState,
  InstructorPage,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { GRADE_FILTER_OPTIONS } from '@/lib/courseLabel';

type CourseTypeTab = 'live' | 'recorded';

function statusForCard(
  status: Course['status'],
): 'published' | 'draft' | 'pending' | 'archived' {
  if (status === 'pending_approval') return 'pending';
  if (status === 'published') return 'published';
  if (status === 'archived') return 'archived';
  return 'draft';
}

function statusLabel(status: Course['status']) {
  if (status === 'pending_approval') return 'Pending';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function courseIcon(course: Course, index: number) {
  const title = (course.title || '').toLowerCase();
  if (title.includes('pure') || title.includes('as')) return '∑';
  if (title.includes('add') || title.includes('additional')) return '📐';
  if (course.courseType === 'recorded') return '🎬';
  return ['📘', '✏️', '🧮', '📊'][index % 4];
}

function formatPrice(course: Course) {
  const fullFee = Number(course.finalPrice ?? course.price ?? 0);
  if (!course.isPaid || !Number.isFinite(fullFee) || fullFee <= 0) return 'Free';

  if (course.courseType === 'live') {
    const monthlyFee = Number(course.monthlyPrice ?? 0);
    if (Number.isFinite(monthlyFee) && monthlyFee > 0) {
      return `৳${monthlyFee.toLocaleString()}/mo`;
    }
  }

  return `৳${fullFee.toLocaleString()}`;
}

function isLiveCourse(course: Course) {
  return course.courseType === 'live';
}

function CoursesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const initialTab = searchParams.get('tab') === 'recorded' ? 'recorded' : 'live';
  const [courseTypeTab, setCourseTypeTab] = useState<CourseTypeTab>(initialTab);
  const [gradeFilter, setGradeFilter] = useState(
    searchParams.get('grade') || 'all',
  );
  const [batchFilter, setBatchFilter] = useState(
    searchParams.get('batch') || 'all',
  );
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  const syncUrl = useCallback(
    (next: {
      tab: CourseTypeTab;
      grade?: string;
      batch?: string;
    }) => {
      const params = new URLSearchParams();
      params.set('tab', next.tab);
      if (next.grade && next.grade !== 'all') params.set('grade', next.grade);
      if (next.batch && next.batch !== 'all') params.set('batch', next.batch);
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (searchParams.toString() === qs) return;
      router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '100',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        courseType: courseTypeTab,
        ...(gradeFilter !== 'all' ? { grade: gradeFilter } : {}),
      });
      const [coursesResponse, batchesRes] = await Promise.all([
        coursesStaffService.listCourses(queryParams.toString()),
        courseTypeTab === 'live'
          ? batchesService.listBatches('limit=200')
          : Promise.resolve({ success: true as const, data: { batches: [] as BatchRecord[] } }),
      ]);
      const data = await coursesResponse.json();
      if (coursesResponse.ok) {
        setCourses(data.data.courses || []);
        setPagination(
          data.data.pagination || { page: 1, limit: 12, total: 0, pages: 0 },
        );
      }
      if (batchesRes.success && batchesRes.data?.batches) {
        setBatches(batchesRes.data.batches);
      } else {
        setBatches([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCourses();
  }, [page, courseTypeTab, gradeFilter]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'live' || tab === 'recorded') {
      setCourseTypeTab(tab);
    }
    setGradeFilter(searchParams.get('grade') || 'all');
    setBatchFilter(searchParams.get('batch') || 'all');
  }, [searchParams]);

  const gradeBatches = useMemo(() => {
    if (gradeFilter === 'all') return batches;
    return batches.filter(
      (batch) =>
        String(batch.grade || '').toUpperCase() === gradeFilter.toUpperCase(),
    );
  }, [batches, gradeFilter]);

  const filteredCourses = useMemo(() => {
    if (batchFilter === 'all') return courses;
    const selectedBatch = batches.find((batch) => batch._id === batchFilter);
    if (!selectedBatch?.courseId) return [];
    return courses.filter((course) => course._id === selectedBatch.courseId);
  }, [batchFilter, batches, courses]);

  const selectCourseTypeTab = (tab: CourseTypeTab) => {
    setCourseTypeTab(tab);
    setPage(1);
    setBatchFilter('all');
    syncUrl({ tab, grade: gradeFilter, batch: 'all' });
  };

  const handleGradeChange = (grade: string) => {
    setGradeFilter(grade);
    setPage(1);
    setBatchFilter('all');
    syncUrl({ tab: courseTypeTab, grade, batch: 'all' });
  };

  const handleBatchChange = (batch: string) => {
    setBatchFilter(batch);
    setPage(1);
    syncUrl({ tab: courseTypeTab, grade: gradeFilter, batch });
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await coursesStaffService.deleteCourse(courseToDelete._id);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete course');
      }
      setCourseToDelete(null);
      await fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              My Courses
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage live batches, recorded lessons, and course content
            </p>
          </div>
          <Button
            onClick={() => router.push('/instructor/courses/create')}
            className="gap-1.5 rounded-full"
          >
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </header>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={courseTypeTab === 'live' ? 'default' : 'outline'}
              onClick={() => selectCourseTypeTab('live')}
              className="gap-2 rounded-full data-[variant=default]:bg-emerald-700"
            >
              <Calendar className="h-4 w-4" />
              Live
            </Button>
            <Button
              type="button"
              variant={courseTypeTab === 'recorded' ? 'default' : 'outline'}
              onClick={() => selectCourseTypeTab('recorded')}
              className="gap-2 rounded-full data-[variant=default]:bg-emerald-700"
            >
              <BookOpen className="h-4 w-4" />
              Recorded
            </Button>
          </div>
          <Button
            asChild
            variant="outline"
            className="shrink-0 gap-2 rounded-full"
          >
            <Link href="/instructor/courses/create">
              New course
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={gradeFilter}
            onChange={(event) => handleGradeChange(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 sm:w-48"
            aria-label="Filter by grade"
          >
            <option value="all">All grades</option>
            {GRADE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {courseTypeTab === 'live' ? (
            <select
              value={batchFilter}
              onChange={(event) => handleBatchChange(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 sm:w-56"
              aria-label="Filter by batch"
            >
              <option value="all">All batches</option>
              {gradeBatches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {loading ? (
          <InstructorLoadingState label="Loading courses…" />
        ) : filteredCourses.length === 0 ? (
          <InstructorEmptyState
            message={`No ${courseTypeTab} courses match these filters`}
            action={
              <Button onClick={() => router.push('/instructor/courses/create')}>
                Create your first course
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course, index) => (
              <InstructorCourseCard
                key={course._id}
                title={course.title}
                subtitle={[
                  course.subjectName || course.categoryInfo?.name || 'Course',
                  course.subjectCode,
                  course.grade,
                  isLiveCourse(course) ? 'Live' : 'Recorded',
                ]
                  .filter(Boolean)
                  .join(' · ')}
                status={statusForCard(course.status)}
                statusLabel={statusLabel(course.status)}
                bannerTone={index % 2 === 1 ? 'blue' : 'primary'}
                bannerIcon={courseIcon(course, index)}
                thumbnailUrl={course.thumbnailUrl}
                stats={[
                  {
                    value: String(course.enrollmentCount ?? 0),
                    label: 'Students',
                  },
                  {
                    value: String(course.lessonCount ?? 0),
                    label: 'Lessons',
                  },
                  {
                    value: course.status === 'published' ? 'Live' : 'Setup',
                    label: 'Stage',
                  },
                ]}
                priceLabel={formatPrice(course)}
                manageHref={
                  isLiveCourse(course)
                    ? `/instructor/materials?tab=live&courseId=${course._id}`
                    : `/instructor/materials?tab=recorded&courseId=${course._id}`
                }
                manageLabel={
                  isLiveCourse(course)
                    ? 'Manage Curriculum →'
                    : 'Manage Lessons →'
                }
                editHref={`/instructor/courses/${course._id}/edit`}
                editLabel="Edit Course"
                onDelete={() => setCourseToDelete(course)}
              />
            ))}
            <InstructorCreateCourseCard href="/instructor/courses/create" />
          </div>
        )}

        {pagination.pages > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages} · {pagination.total}{' '}
              courses
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        <ConfirmModal
          open={Boolean(courseToDelete)}
          onClose={() => setCourseToDelete(null)}
          onConfirm={() => void handleDeleteCourse()}
          title="Delete course"
          description={`Are you sure you want to delete "${courseToDelete?.title || 'this course'}"? This action cannot be undone.`}
          confirmText="Delete course"
          variant="danger"
          loading={deleteLoading}
        />
      </InstructorPage>
    </InstructorRoleShell>
  );
}

export default function CoursesPage() {
  return (
    <InstructorPageWrapper>
      <Suspense fallback={<InstructorLoadingState label="Loading courses…" />}>
        <CoursesPageContent />
      </Suspense>
    </InstructorPageWrapper>
  );
}
