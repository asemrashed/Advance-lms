"use client";

import { useEffect, useMemo, useState } from "react";
import { publicCatalogService } from "@/services/publicCatalogService";

export const ALL_FILTER = "all";

export type CatalogFilterOption = {
  id: string;
  label: string;
  count: number;
};

type UseCascadingCatalogFiltersOptions = {
  courseType: "live" | "recorded";
  initialInstructorId?: string;
};

function parseFilterRows(payload: unknown): CatalogFilterOption[] {
  const body = payload as { success?: boolean; data?: unknown[] };
  const rows = Array.isArray(body?.data) ? body.data : [];
  if (!body?.success || rows.length === 0) return [];

  return rows
    .map((row) => {
      const item = row as {
        id?: string;
        _id?: string;
        label?: string;
        name?: string;
        count?: number;
      };
      const id = String(item?.id || item?._id || "").trim();
      const label = String(item?.label || item?.name || "").trim();
      const count = Number.isFinite(Number(item?.count)) ? Number(item.count) : 0;
      if (!id || !label || count <= 0) return null;
      return { id, label, count };
    })
    .filter(Boolean) as CatalogFilterOption[];
}

function withAllOption(
  rows: CatalogFilterOption[],
  allLabel: string,
): CatalogFilterOption[] {
  if (rows.length === 0) {
    return [{ id: ALL_FILTER, label: allLabel, count: 0 }];
  }
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return [{ id: ALL_FILTER, label: allLabel, count: total }, ...rows];
}

export function useCascadingCatalogFilters({
  courseType,
  initialInstructorId,
}: UseCascadingCatalogFiltersOptions) {
  const [grade, setGrade] = useState(ALL_FILTER);
  const [subjectId, setSubjectId] = useState(ALL_FILTER);
  const [instructorId, setInstructorId] = useState(
    initialInstructorId?.trim() || ALL_FILTER,
  );
  const [subjects, setSubjects] = useState<CatalogFilterOption[]>([]);
  const [instructors, setInstructors] = useState<CatalogFilterOption[]>([]);

  useEffect(() => {
    if (initialInstructorId?.trim()) {
      setInstructorId(initialInstructorId.trim());
    }
  }, [initialInstructorId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await publicCatalogService.listSubjects({
          courseType,
          grade: grade !== ALL_FILTER ? grade : undefined,
          instructorId: instructorId !== ALL_FILTER ? instructorId : undefined,
        });
        if (cancelled || !res.ok) return;
        const payload = await res.json();
        setSubjects(parseFilterRows(payload));
      } catch {
        if (!cancelled) setSubjects([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseType, grade, instructorId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await publicCatalogService.listInstructors({
          courseType,
          grade: grade !== ALL_FILTER ? grade : undefined,
          subjectId: subjectId !== ALL_FILTER ? subjectId : undefined,
        });
        if (cancelled || !res.ok) return;
        const payload = await res.json();
        setInstructors(parseFilterRows(payload));
      } catch {
        if (!cancelled) setInstructors([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseType, grade, subjectId]);

  useEffect(() => {
    if (subjectId === ALL_FILTER) return;
    if (!subjects.some((row) => row.id === subjectId)) {
      setSubjectId(ALL_FILTER);
    }
  }, [subjectId, subjects]);

  useEffect(() => {
    if (instructorId === ALL_FILTER) return;
    if (!instructors.some((row) => row.id === instructorId)) {
      setInstructorId(ALL_FILTER);
    }
  }, [instructorId, instructors]);

  const subjectOptions = useMemo(
    () => withAllOption(subjects, "All subjects"),
    [subjects],
  );

  const instructorOptions = useMemo(
    () => withAllOption(instructors, "All instructors"),
    [instructors],
  );

  const clearFilters = () => {
    setGrade(ALL_FILTER);
    setSubjectId(ALL_FILTER);
    setInstructorId(ALL_FILTER);
  };

  const hasGradeFilter = grade !== ALL_FILTER;
  const hasSubjectFilter = subjectId !== ALL_FILTER;
  const hasInstructorFilter = instructorId !== ALL_FILTER;

  return {
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
  };
}
