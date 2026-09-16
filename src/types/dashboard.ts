import type { StudentDashboardComposite } from "./studentDashboard";

/** QA role switcher on `/dashboard`; removed in Phase 8. */
export type DashboardRole = "student" | "instructor" | "admin";

/** `GET /api/instructor/dashboard` — `learning-project/src/app/api/instructor/dashboard/route.ts` */
export interface InstructorDashboardApiPayload {
  overview: {
    totalCourses: number;
    totalStudents: number;
    totalEnrollments: number;
    weeklyCompletions: number;
    completionChange: number;
    successfulPayments: number;
    totalRevenue: number;
    pendingSubmissions?: number;
    averageRating?: number;
    reviewCount?: number;
  };
  navBadges?: {
    assignments?: string | null;
    /** Shown on Profile nav until bank details are complete */
    profile?: string | null;
  };
  courseTypeMetrics: {
    live: {
      totalCourses: number;
      totalBatches: number;
      totalStudents: number;
      totalInstructors: number;
      totalRevenue: number;
    };
    recorded: {
      totalCourses: number;
      totalBatches: number;
      totalStudents: number;
      totalInstructors: number;
      totalRevenue: number;
    };
  };
  recentEnrollments: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    enrolledAt: string;
    status: string;
  }>;
  trends: {
    enrollments: Array<{ _id: string; count: number }>;
  };
  courses: Array<{
    _id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    category: { _id: string; name: string };
    studentCount: number;
    averageRating: number;
    totalLessons: number;
    createdAt: string;
    status: "draft" | "published" | "archived";
    courseType?: "live" | "recorded";
  }>;
  students: Array<{
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    enrolledCourses: number;
    lastActive: string;
  }>;
  batchSummary: StaffBatchDashboardSummary;
}

export interface StaffBatchDashboardSummary {
  totalBatches: number;
  batches: Array<{
    _id: string;
    name: string;
    grade: string;
    shortDescription?: string;
    thumbnailUrl?: string;
    fee: number;
    maxStudents: number;
    enrolledCount: number;
    nextClassAt?: string;
  }>;
  upcomingClasses: Array<{
    _id: string;
    batchId: string;
    batchName: string;
    title: string;
    scheduledAt: string;
    type: "live" | "recorded";
  }>;
}

/** `GET /api/admin/dashboard` — `learning-project/src/app/api/admin/dashboard/route.ts` */
export interface AdminDashboardApiPayload {
  overview: {
    totalStudents: number;
    totalCourses: number;
    totalEnrollments: number;
    totalTeachers: number;
    activeStudents: number;
    completedCourses: number;
    newEnrollmentsThisWeek: number;
    enrollmentChange: number;
    courseCompletionsThisWeek: number;
    completionChange: number;
  };
  courseTypeMetrics: {
    live: {
      totalCourses: number;
      totalBatches: number;
      totalStudents: number;
      totalInstructors: number;
      totalRevenue: number;
    };
    recorded: {
      totalCourses: number;
      totalBatches: number;
      totalStudents: number;
      totalInstructors: number;
      totalRevenue: number;
    };
  };
  leaderboard: Array<{
    _id: string;
    name: string;
    email: string;
    completedCourses: number;
    averageProgress: number;
    totalTimeSpent: number;
  }>;
  recentEnrollments: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    enrolledAt: string;
    status: string;
  }>;
  courseStats: Array<{
    id: string;
    title: string;
    price: number;
    status: string;
    courseType: "live" | "recorded";
    enrollmentCount: number;
    completionRate: number;
    createdAt: string;
  }>;
  /** Top courses by enrollment for live/recorded charts */
  chartCourseStats: Array<{
    id: string;
    title: string;
    courseType: "live" | "recorded";
    enrollmentCount: number;
    completionRate: number;
  }>;
  paymentStats: {
    totalRevenue: number;
    totalTransactions: number;
    successfulPayments: number;
    pendingPayments: number;
    failedPayments: number;
    successRate: number;
  };
  examStats: Array<{
    id: string;
    title: string;
    totalAttempts: number;
    averageScore: number;
    createdAt: string;
  }>;
  trends: {
    enrollments: Array<{ _id: string; count: number }>;
    completions: Array<{ _id: string; count: number }>;
    revenue: Array<{ _id: string; total: number }>;
  };
  batchSummary: StaffBatchDashboardSummary;
}

export type DashboardPayload =
  | { role: "student"; data: StudentDashboardComposite }
  | { role: "instructor"; data: InstructorDashboardApiPayload }
  | { role: "admin"; data: AdminDashboardApiPayload };
