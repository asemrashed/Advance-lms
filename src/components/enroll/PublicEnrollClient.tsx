'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CourseCard from '@/components/CourseCard';
import { CourseCardSkeleton } from '@/components/skeletons/CourseCardSkeleton';
import { PublicCourseBrowseSkeleton } from '@/components/skeletons/LiveEnrollSkeleton';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/fade-in';
import { mapLiveCourseRowToCard } from '@/lib/publicCourseCard';
import { GradeFilterSelect } from '@/components/ui/GradeFilterSelect';
import {
  ALL_FILTER,
  useCascadingCatalogFilters,
} from '@/hooks/useCascadingCatalogFilters';
import {
  publicLiveCoursesService,
  type PublicLiveCourseRow,
} from '@/services/publicLiveCoursesService';

const PAGE_SIZE = 12;

export function PublicEnrollClient() {
  const [courses, setCourses] = useState<PublicLiveCourseRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    grade,
    setGrade,
    subjectId,
    setSubjectId,
    instructorId,
    setInstructorId,
    subjectOptions,
    instructorOptions,
    clearFilters,
    hasGradeFilter,
    hasSubjectFilter,
    hasInstructorFilter,
  } = useCascadingCatalogFilters({ courseType: 'live' });

  const loadCourses = useCallback(
    async (
      term: string,
      selectedSubjectId: string,
      selectedInstructorId: string,
      selectedGrade: string,
      pageNum: number,
    ) => {
      setLoading(true);
      setError(null);
      const res = await publicLiveCoursesService.listLiveCourses({
        search: term.trim() || undefined,
        subjectId:
          selectedSubjectId !== ALL_FILTER ? selectedSubjectId : undefined,
        instructorId:
          selectedInstructorId !== ALL_FILTER ? selectedInstructorId : undefined,
        grade: selectedGrade !== ALL_FILTER ? selectedGrade : undefined,
        page: pageNum,
        limit: PAGE_SIZE,
      });
      if (res.success && res.data) {
        setCourses(res.data.courses);
        setTotalPages(res.data.pagination.pages || 1);
        setTotalCount(res.data.pagination.total || res.data.courses.length);
      } else {
        setError(res.error || 'Failed to load live courses');
        setCourses([]);
        setTotalPages(1);
        setTotalCount(0);
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCourses(search, subjectId, instructorId, grade, page);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadCourses, search, subjectId, instructorId, grade, page]);

  useEffect(() => {
    setPage(1);
  }, [search, subjectId, instructorId, grade]);

  const hasActiveFilters =
    hasGradeFilter ||
    hasSubjectFilter ||
    hasInstructorFilter ||
    search.trim().length > 0;

  // Full-page skeleton only — never stack with a spinner / "Loading…" text.
  if (loading && courses.length === 0 && !error) {
    return <PublicCourseBrowseSkeleton label="Loading live courses" />;
  }

  return (
    <FadeIn viewport={false} className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Live courses</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Enroll in a live course, then pick a batch section that fits your schedule.
          Curriculum and pricing are shared across all batches.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <GradeFilterSelect
          value={grade}
          onChange={setGrade}
          className="w-full lg:max-w-[220px]"
        />
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground lg:max-w-[220px]"
          aria-label="Filter by subject"
        >
          {subjectOptions.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
              {row.id !== ALL_FILTER ? ` (${row.count})` : ''}
            </option>
          ))}
        </select>

        <select
          value={instructorId}
          onChange={(event) => setInstructorId(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground lg:max-w-[220px]"
          aria-label="Filter by instructor"
        >
          {instructorOptions.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
              {row.id !== ALL_FILTER ? ` (${row.count})` : ''}
            </option>
          ))}
        </select>

        <Input
          className="w-full flex-1"
          placeholder="Search live courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              clearFilters();
              setSearch('');
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <StaggerContainer
          viewport={false}
          className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <StaggerItem key={`skeleton-${i}`} className="h-full w-full">
              <CourseCardSkeleton />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : courses.length === 0 ? (
        <p className="text-muted-foreground">
          {hasActiveFilters
            ? 'No live courses match the selected filters.'
            : 'No live courses yet. Check back soon.'}
        </p>
      ) : (
        <StaggerContainer
          viewport={false}
          className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
        >
          {courses.map((course, i) => (
            <StaggerItem key={course._id} className="h-full w-full">
              <CourseCard course={mapLiveCourseRowToCard(course)} index={i} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="px-3 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </FadeIn>
  );
}
