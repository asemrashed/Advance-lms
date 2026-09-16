import { useState, useEffect, useCallback, useRef } from 'react';
import { CourseCategory, CourseCategoryStats, CourseCategorySearchParams } from '@/types/course-category';

interface UseCourseCategoriesReturn {
  categories: CourseCategory[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: CourseCategoryStats | null;
  fetchCategories: (params?: CourseCategorySearchParams) => Promise<void>;
  createCategory: (categoryData: any) => Promise<CourseCategory | null>;
  updateCategory: (id: string, categoryData: any) => Promise<CourseCategory | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  searchCategories: (query: string, params?: CourseCategorySearchParams) => Promise<void>;
}

export const useCourseCategories = (initialParams?: CourseCategorySearchParams): UseCourseCategoriesReturn => {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState<CourseCategoryStats | null>(null);

  const fetchCategories = useCallback(async (params: CourseCategorySearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
      if (params.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

      const response = await fetch(`/api/categories?${searchParams.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setCategories(data.data.categories);
        setPagination(data.data.pagination);
        setStats(data.data.stats);
        return;
      }

      // Instructors are not allowed on /api/categories. Fallback to public categories.
      if (response.status === 401 || response.status === 403) {
        const publicResponse = await fetch('/api/public/categories');
        const publicData = await publicResponse.json();

        if (!publicResponse.ok) {
          throw new Error(publicData.error || data.error || 'Failed to fetch categories');
        }

        const normalized = Array.isArray(publicData.data)
          ? publicData.data.map((item: any) => ({
              _id: String(item.id || item._id || item.label || ''),
              name: String(item.label || item.name || ''),
              description: '',
              color: '',
              icon: '',
              isActive: true,
              courseCount: typeof item.count === 'number' ? item.count : 0,
              createdAt: new Date(0).toISOString(),
              updatedAt: new Date(0).toISOString(),
            }))
          : [];

        setCategories(normalized);
        setPagination({
          page: 1,
          limit: normalized.length || 10,
          total: normalized.length,
          pages: normalized.length > 0 ? 1 : 0,
        });
        setStats(null);
        return;
      }

      throw new Error(data.error || 'Failed to fetch categories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (categoryData: any): Promise<CourseCategory | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create category');
      }

      // Refresh the categories list
      await fetchCategories();
      
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
      console.error('Error creating category:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id: string, categoryData: any): Promise<CourseCategory | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update category');
      }

      // Update the category in the local state
      setCategories(prev => prev.map(category => 
        category._id === id ? data.data : category
      ));
      
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
      console.error('Error updating category:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }

      // Remove the category from the local state
      setCategories(prev => prev.filter(category => category._id !== id));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      console.error('Error deleting category:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCategories = useCallback(async (query: string, params: CourseCategorySearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      searchParams.append('q', query);
      
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
      if (params.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

      const response = await fetch(`/api/categories/search?${searchParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search categories');
      }

      setCategories(data.data.categories);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search categories');
      console.error('Error searching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories once on mount. We intentionally capture the initial params
  // in a ref so callers can pass an inline object literal (a new reference each
  // render) without triggering an infinite refetch loop.
  const initialParamsRef = useRef(initialParams);
  useEffect(() => {
    fetchCategories(initialParamsRef.current);
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    pagination,
    stats,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    searchCategories
  };
};

// Hook for category statistics
export const useCourseCategoryStats = () => {
  const [stats, setStats] = useState<CourseCategoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/categories/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch category statistics');
      }

      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch category statistics');
      console.error('Error fetching category stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};
