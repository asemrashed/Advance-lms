import { useState, useCallback } from 'react';
import { 
  Enrollment, 
  CreateEnrollmentRequest, 
  UpdateEnrollmentRequest, 
  EnrollmentFilters, 
  EnrollmentListResponse,
  EnrollmentStats,
  CourseEnrollmentStats,
  StudentEnrollmentStats
} from '@/types/enrollment';

export const useEnrollments = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [stats, setStats] = useState<EnrollmentStats | null>(null);

  // Fetch enrollments
  const fetchEnrollments = useCallback(async (filters: EnrollmentFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.student) params.append('student', filters.student);
      if (filters.course) params.append('course', filters.course);
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.enrolledAfter) params.append('enrolledAfter', filters.enrolledAfter);
      if (filters.enrolledBefore) params.append('enrolledBefore', filters.enrolledBefore);
      if (filters.progressMin !== undefined) params.append('progressMin', filters.progressMin.toString());
      if (filters.progressMax !== undefined) params.append('progressMax', filters.progressMax.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/enrollments?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch enrollments');
      }

      setEnrollments(data.data.enrollments);
      setPagination(data.data.pagination);
      setStats(data.data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enrollments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create enrollment
  const createEnrollment = useCallback(async (enrollmentData: CreateEnrollmentRequest): Promise<Enrollment | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollmentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create enrollment');
      }

      // Refresh enrollments list
      await fetchEnrollments();
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create enrollment');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEnrollments]);

  // Update enrollment
  const updateEnrollment = useCallback(async (id: string, enrollmentData: UpdateEnrollmentRequest): Promise<Enrollment | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/enrollments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollmentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update enrollment');
      }

      // Update local state
      setEnrollments(prev => 
        prev.map(enrollment => 
          enrollment._id === id ? data.data : enrollment
        )
      );

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update enrollment');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete enrollment
  const deleteEnrollment = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/enrollments/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete enrollment');
      }

      // Update local state
      setEnrollments(prev => prev.filter(enrollment => enrollment._id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete enrollment');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search enrollments
  const searchEnrollments = useCallback(async (query: string, filters: Partial<EnrollmentFilters> = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.student) params.append('student', filters.student);
      if (filters.course) params.append('course', filters.course);
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/enrollments/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search enrollments');
      }

      setEnrollments(data.data.enrollments);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search enrollments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get enrollment by ID
  const getEnrollment = useCallback(async (id: string): Promise<Enrollment | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/enrollments/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch enrollment');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enrollment');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get enrollment stats
  const getEnrollmentStats = useCallback(async (type: 'general' | 'course' | 'student' = 'general', id?: string): Promise<EnrollmentStats | CourseEnrollmentStats | StudentEnrollmentStats | null> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('type', type);
      
      if (type === 'course' && id) {
        params.append('courseId', id);
      } else if (type === 'student' && id) {
        params.append('studentId', id);
      }

      const response = await fetch(`/api/enrollments/stats?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch enrollment stats');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enrollment stats');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Enroll student in course
  const enrollStudent = useCallback(async (studentId: string, courseId: string, paymentData?: {
    paymentStatus?: 'pending' | 'paid' | 'failed';
    paymentAmount?: number;
    paymentMethod?: string;
    paymentId?: string;
  }): Promise<Enrollment | null> => {
    const enrollmentData: CreateEnrollmentRequest = {
      student: studentId,
      course: courseId,
      ...paymentData
    };

    return await createEnrollment(enrollmentData);
  }, [createEnrollment]);

  // Update enrollment progress
  const updateProgress = useCallback(async (id: string, progress: number): Promise<Enrollment | null> => {
    return await updateEnrollment(id, { progress });
  }, [updateEnrollment]);

  // Complete enrollment
  const completeEnrollment = useCallback(async (id: string): Promise<Enrollment | null> => {
    return await updateEnrollment(id, { status: 'completed', progress: 100 });
  }, [updateEnrollment]);

  // Drop enrollment
  const dropEnrollment = useCallback(async (id: string): Promise<Enrollment | null> => {
    return await updateEnrollment(id, { status: 'dropped' });
  }, [updateEnrollment]);

  // Suspend enrollment
  const suspendEnrollment = useCallback(async (id: string): Promise<Enrollment | null> => {
    return await updateEnrollment(id, { status: 'suspended' });
  }, [updateEnrollment]);

  // Reactivate enrollment
  const reactivateEnrollment = useCallback(async (id: string): Promise<Enrollment | null> => {
    return await updateEnrollment(id, { status: 'enrolled' });
  }, [updateEnrollment]);

  return {
    enrollments,
    loading,
    error,
    pagination,
    stats,
    fetchEnrollments,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment,
    searchEnrollments,
    getEnrollment,
    getEnrollmentStats,
    enrollStudent,
    updateProgress,
    completeEnrollment,
    dropEnrollment,
    suspendEnrollment,
    reactivateEnrollment
  };
};
