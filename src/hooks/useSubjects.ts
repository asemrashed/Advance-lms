import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Subject,
  SubjectSearchParams,
  SubjectStats,
} from "@/types/subject";

interface UseSubjectsReturn {
  subjects: Subject[];
  loading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; pages: number };
  stats: SubjectStats | null;
  fetchSubjects: (params?: SubjectSearchParams) => Promise<void>;
  createSubject: (data: {
    name: string;
    code: string;
    grade?: string;
    chapters: { name: string; order: number }[];
    components: { name: string; type: "mcq" | "written"; order: number; _id?: string }[];
    qbAccessPrice?: number;
    isActive?: boolean;
  }) => Promise<Subject | null>;
  updateSubject: (id: string, data: Record<string, unknown>) => Promise<Subject | null>;
  deleteSubject: (id: string) => Promise<boolean>;
}

export function useSubjects(initialParams?: SubjectSearchParams): UseSubjectsReturn {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, pages: 0 });
  const [stats, setStats] = useState<SubjectStats | null>(null);

  const fetchSubjects = useCallback(async (params: SubjectSearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.search) searchParams.set("search", params.search);
      if (params.grade) searchParams.set("grade", params.grade);
      if (params.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
      if (params.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
      if (params.includeCounts) searchParams.set("includeCounts", "true");

      const response = await fetch(`/api/subjects?${searchParams.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch subjects");

      setSubjects(data.data.subjects || []);
      setPagination(data.data.pagination || { page: 1, limit: 100, total: 0, pages: 0 });
      setStats(data.data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubject = useCallback(
    async (payload: {
      name: string;
      code: string;
      grade?: string;
      chapters: { name: string; order: number }[];
      components: { name: string; type: "mcq" | "written"; order: number; _id?: string }[];
      qbAccessPrice?: number;
      isActive?: boolean;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create subject");
        await fetchSubjects();
        return data.data as Subject;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create subject");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchSubjects],
  );

  const updateSubject = useCallback(async (id: string, payload: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update subject");
      setSubjects((prev) => prev.map((s) => (s._id === id ? data.data : s)));
      return data.data as Subject;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subject");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete subject");
      setSubjects((prev) => prev.filter((s) => s._id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subject");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const initialParamsRef = useRef(initialParams);
  useEffect(() => {
    fetchSubjects(initialParamsRef.current);
  }, [fetchSubjects]);

  return {
    subjects,
    loading,
    error,
    pagination,
    stats,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  };
}
