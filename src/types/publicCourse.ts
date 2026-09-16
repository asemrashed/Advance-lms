/**
 * `data` field from GET /api/public/courses/[id] — see learning-project
 * `src/app/api/public/courses/[id]/route.ts`.
 */
export interface PublicCourseDetailData {
  _id: string;
  title: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  categoryInfo?: unknown;
  thumbnailUrl?: string;
  isPaid: boolean;
  status: "published";
  isHidden?: boolean;
  price?: number;
  salePrice?: number;
  originalPrice?: number;
  finalPrice: number;
  discountPercentage: number;
  displayOrder?: number;
  duration?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  lessonCount?: number;
  enrollmentCount?: number;
  tags?: string[];
  createdBy: {
    _id: string;
    name: string;
    role: string;
    email?: string;
  };
  instructor?: {
    _id: string;
    name: string;
    role: string;
    email?: string;
    avatar?: string;
    phone?: string;
    address?: string;
    bio?: string;
    specialization?: string;
    experience?: string;
    socialLinks?: {
      linkedin?: string;
      twitter?: string;
      website?: string;
    };
    coursesCount?: number;
    studentsCount?: number;
    rating?: number;
  };
  createdAt: string;
  updatedAt: string;
}
