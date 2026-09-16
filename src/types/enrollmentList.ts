/** `GET /api/enrollments` success body. */
export interface EnrollmentListEnrollment {
  _id: string;
  student: string;
  course: string;
  status: string;
  progress?: number;
  enrolledAt: string;
  lastAccessedAt?: string;
  paymentStatus?: string;
  courseLuInfo?: unknown;
  courseInfo?: unknown;
  studentInfo?: unknown;
}

export interface EnrollmentListPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface EnrollmentListStats {
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

export interface EnrollmentListData {
  enrollments: EnrollmentListEnrollment[];
  pagination: EnrollmentListPagination;
  stats: EnrollmentListStats;
}

export interface EnrollmentListSuccessBody {
  success: true;
  data: EnrollmentListData;
}
