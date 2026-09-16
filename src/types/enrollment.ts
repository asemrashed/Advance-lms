import type { User } from "./user";
import type { Course } from "./course";

export interface Enrollment {
  _id: string;
  student: string;
  course: string;
  selectedBatchId?: string;
  batchId?: string;
  batchName?: string;
  enrolledAt: string;
  status: 
    | "enrolled"
    | "in_progress"
    | "completed"
    | "suspended"
    | "dropped";
  progress: number;
  lastAccessedAt?: string;
  completedAt?: string;
  droppedAt?: string;
  suspendedAt?: string;
  paymentStatus: "pending" | "paid" | "failed";
  paymentAmount?: number;
  paymentMethod?: string;
  paymentId?: string;
  billingPlan?: "monthly" | "full";
  accessBlocked?: boolean;
  accessExpiresAt?: string;
  paymentDueAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  studentInfo?: Pick<User, "_id" | "name" | "email" | "avatar">;
  courseLuInfo?: Pick<
    Course,
    "_id" | "title" | "description" | "thumbnailUrl" | "price" | "category" | "isPaid"
  >;
  courseInfo?: Pick<
    Course,
    "_id" | "title" | "description" | "thumbnailUrl" | "price" | "category" | "isPaid"
  >;
}

export interface CreateEnrollmentRequest {
  course: string;
  student?: string;
  newStudent?: {
    name: string;
    email: string;
    phone: string;
  };
  paymentStatus?: "pending" | "paid" | "failed";
  paymentAmount?: number;
  paymentMethod?: string;
  paymentDueAt?: string | null;
  billingPlan?: "monthly" | "full";
  lockPrice?: boolean;
  notes?: string;
}

export interface UpdateEnrollmentRequest {
  status?:
    | "enrolled"
    | "in_progress"
    | "completed"
    | "suspended"
    | "dropped";
  progress?: number;
  paymentStatus?: "pending" | "paid" | "failed";
  paymentAmount?: number;
  paymentMethod?: string;
  paymentDueAt?: string | null;
  billingPlan?: "monthly" | "full";
  lockPrice?: boolean;
  notes?: string;
}

export interface EnrollmentFilters {
  student?: string;
  course?: string;
  status?: 
    | "enrolled"
    | "in_progress"
    | "completed"
    | "suspended"
    | "dropped";
  paymentStatus?: "pending" | "paid" | "failed";
  enrolledAfter?: string;
  enrolledBefore?: string;
  progressMin?: number;
  progressMax?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface EnrollmentStats {
  total: number;
  active: number;
  completed: number;
  dropped: number;
  suspended: number;
  paid: number;
  pending: number;
  failed: number;
  totalRevenue: number;
  averageProgress: number;
  completionRate: number;
  dropRate: number;
}

export interface CourseEnrollmentStats extends EnrollmentStats {
  courseId: string;
  courseTitle: string;
}

export interface StudentEnrollmentStats extends EnrollmentStats {
  studentId: string;
  studentName: string;
}

export interface EnrollmentListResponse {
  enrollments: Enrollment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: EnrollmentStats;
}
