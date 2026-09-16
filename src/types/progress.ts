export interface UserProgress {
  _id: string;
  user: string;
  course: string;
  lesson: string;
  isCompleted: boolean;
  completedAt?: string;
  progressPercentage: number;
  timeSpent: number;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseProgress {
  _id: string;
  user: string;
  course: string;
  isCompleted: boolean;
  completedAt?: string;
  progressPercentage: number;
  totalLessons: number;
  completedLessons: number;
  totalTimeSpent: number;
  lastAccessedAt: string;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserProgressRequest {
  user: string;
  course: string;
  lesson: string;
  isCompleted?: boolean;
  progressPercentage?: number;
  timeSpent?: number;
}

export interface UpdateUserProgressRequest {
  isCompleted?: boolean;
  progressPercentage?: number;
  timeSpent?: number;
}

export interface CreateCourseProgressRequest {
  user: string;
  course: string;
  totalLessons?: number;
}

export interface UpdateCourseProgressRequest {
  isCompleted?: boolean;
  completedLessons?: number;
  totalTimeSpent?: number;
}

export interface ProgressFilters {
  user?: string;
  course?: string;
  lesson?: string;
  isCompleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'completedAt' | 'progressPercentage';
  sortOrder?: 'asc' | 'desc';
}

export interface ProgressStats {
  totalProgress: number;
  completedProgress: number;
  averageProgressPercentage: number;
  totalTimeSpent: number;
  averageTimeSpent: number;
  completionRate: number;
}

export interface ProgressPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProgressListResponse {
  progress: UserProgress[];
  pagination: ProgressPagination;
  stats: ProgressStats;
}

export interface CourseProgressListResponse {
  courseProgress: CourseProgress[];
  pagination: ProgressPagination;
  stats: ProgressStats;
}

export interface ProgressSearchParams {
  user?: string;
  course?: string;
  lesson?: string;
  isCompleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'completedAt' | 'progressPercentage';
  sortOrder?: 'asc' | 'desc';
}
