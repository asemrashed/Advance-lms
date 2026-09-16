"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CourseCard from "@/components/CourseCard";
import { CourseCardSkeleton } from "@/components/skeletons/CourseCardSkeleton";
import { PublicCourseBrowseSkeleton } from "@/components/skeletons/LiveEnrollSkeleton";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in";
import { mapPublicCourseRowToCard } from "@/lib/publicCourseCard";
import { GradeFilterSelect } from "@/components/ui/GradeFilterSelect";
import {
  ALL_FILTER,
  useCascadingCatalogFilters,
} from "@/hooks/useCascadingCatalogFilters";
import { fetchPublicCourses } from "@/services/publicCoursesService";
import type { PublicCourseRow } from "@/types/public-course";

const PAGE_SIZE = 12;

export function CoursesCatalogClient() {
  const [courses, setCourses] = useState<PublicCourseRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [initialInstructorId, setInitialInstructorId] = useState<
    string | undefined
  >();

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
  } = useCascadingCatalogFilters({
    courseType: "recorded",
    initialInstructorId,
  });

  useEffect(() => {
    const requestedInstructor = new URLSearchParams(
      window.location.search,
    ).get("instructorId");
    if (requestedInstructor?.trim()) {
      setInitialInstructorId(requestedInstructor.trim());
    }
  }, []);

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

      try {
        const res = await fetchPublicCourses({
          page: pageNum,
          limit: PAGE_SIZE,
          courseType: "recorded",
          search: term.trim() || undefined,
          subjectId:
            selectedSubjectId !== ALL_FILTER ? selectedSubjectId : undefined,
          instructorId:
            selectedInstructorId !== ALL_FILTER
              ? selectedInstructorId
              : undefined,
          grade: selectedGrade !== ALL_FILTER ? selectedGrade : undefined,
        });

        if (res.success && res.data) {
          setCourses(res.data.courses);
          setTotalPages(res.data.pagination.pages || 1);
        } else {
          setError("Failed to load courses");
          setCourses([]);
          setTotalPages(1);
        }
      } catch {
        setError("Failed to load courses");
        setCourses([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
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

  if (loading && courses.length === 0 && !error) {
    return (
      <PublicCourseBrowseSkeleton label="Loading recorded courses" />
    );
  }

  return (
    <FadeIn viewport={false} className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Recorded courses</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Browse self-paced recorded courses. Learn at your own speed with
          structured lessons, worksheets, and practice materials.
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
              {row.id !== ALL_FILTER ? ` (${row.count})` : ""}
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
              {row.id !== ALL_FILTER ? ` (${row.count})` : ""}
            </option>
          ))}
        </select>

        <Input
          className="w-full flex-1"
          placeholder="Search recorded courses…"
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
              setSearch("");
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

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
            ? "No recorded courses match the selected filters."
            : "No recorded courses yet. Check back soon."}
        </p>
      ) : (
        <StaggerContainer
          viewport={false}
          className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
        >
          {courses.map((course, i) => (
            <StaggerItem key={course._id} className="h-full w-full">
              <CourseCard
                course={mapPublicCourseRowToCard(course)}
                index={i}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {totalPages > 1 ? (
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
      ) : null}
    </FadeIn>
  );
}
