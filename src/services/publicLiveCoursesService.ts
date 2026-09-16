import type { PublicBatchRow, PublicBatchRoutineDay } from '@/services/publicBatchesService';

export type PublicLiveCourseRow = {
  _id: string;
  courseType: 'live';
  title: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  grade?: string;
  subjectName?: string;
  isPaid: boolean;
  price: number;
  salePrice?: number;
  finalPrice: number;
  monthlyPrice?: number;
  discountPercentage: number;
  features?: string[];
  instructor?: {
    _id: string;
    name: string;
    avatar?: string;
  };
};

export type PublicLiveCourseChapter = {
  _id: string;
  title: string;
  description?: string;
  order: number;
  lessons: {
    _id: string;
    title: string;
    order: number;
    duration?: number;
    lessonType: string;
    isFree?: boolean;
  }[];
};

export type PublicLiveCourseBatch = {
  batch: PublicBatchRow;
  routine: PublicBatchRoutineDay[];
};

export const publicLiveCoursesService = {
  async listLiveCourses(params?: {
    search?: string;
    subjectId?: string;
    instructorId?: string;
    grade?: string;
    page?: number;
    limit?: number;
  }) {
    const q = new URLSearchParams({ courseType: 'live' });
    if (params?.search) q.set('search', params.search);
    if (params?.subjectId) q.set('subjectId', params.subjectId);
    if (params?.instructorId) q.set('instructorId', params.instructorId);
    if (params?.grade) q.set('grade', params.grade);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const res = await fetch(`/api/public/courses?${q}`, { cache: 'no-store' });
    return res.json() as Promise<{
      success: boolean;
      data?: {
        courses: PublicLiveCourseRow[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
      error?: string;
    }>;
  },

  async getLiveCourse(courseId: string) {
    const res = await fetch(`/api/public/live-courses/${courseId}`, {
      cache: 'no-store',
    });
    return res.json() as Promise<{
      success: boolean;
      data?: {
        course: PublicLiveCourseRow;
        chapters: PublicLiveCourseChapter[];
        batches: PublicLiveCourseBatch[];
      };
      error?: string;
    }>;
  },
};
