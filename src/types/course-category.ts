export interface CourseCategory {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  courseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseCategoryRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateCourseCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface CourseCategoryFilters {
  search?: string;
  isActive?: boolean;
}

export interface CourseCategoryStats {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  categoriesWithCourses: number;
}

export interface CourseCategoryPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CourseCategoryListResponse {
  categories: CourseCategory[];
  pagination: CourseCategoryPagination;
  stats?: CourseCategoryStats;
}

export interface CourseCategorySearchParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'courseCount';
  sortOrder?: 'asc' | 'desc';
}
