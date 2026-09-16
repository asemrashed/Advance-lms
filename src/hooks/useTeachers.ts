import { useState, useCallback, useEffect } from 'react';

export interface Teacher {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherListResponse {
  teachers: Teacher[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export const useTeachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teachers');
      const data = await response.json();

      // Non-admin/instructor contexts may not be allowed to list teachers.
      // Keep this hook fail-soft so shared UIs can reuse it safely.
      if (response.status === 401 || response.status === 403) {
        setTeachers([]);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch teachers');
      }

      const teachersPayload = data?.data?.teachers ?? data?.teachers ?? [];
      setTeachers(Array.isArray(teachersPayload) ? teachersPayload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching teachers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch teachers on mount
  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return {
    teachers,
    loading,
    error,
    fetchTeachers,
  };
};
