/**
 * Shapes from `learning-project/src/app/student/dashboard/page.tsx`
 * (data from `/api/enrollments` + `/api/progress` in reference app).
 */

export interface StudentDashboardCourse {
  _id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  price: number;
  isPaid: boolean;
  category: {
    _id: string;
    name: string;
  };
  instructor: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StudentDashboardEnrollment {
  _id: string;
  course: StudentDashboardCourse;
  enrolledAt: string;
  status: "enrolled" | "in_progress" | "completed" | "dropped" | "suspended";
  progress: number;
  lastAccessedAt: string;
  paymentStatus: "pending" | "paid" | "failed";
}

export interface StudentDashboardCourseProgress {
  _id: string;
  course: string;
  isCompleted: boolean;
  completedAt?: string;
  progressPercentage: number;
  totalLessons: number;
  completedLessons: number;
  totalTimeSpent: number;
  lastAccessedAt: string;
  startedAt: string;
}

export interface StudentDashboardBatchSummary {
  _id: string;
  name: string;
  grade: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  fee: number;
  maxStudents: number;
  enrolledCount: number;
}

export interface StudentDashboardUpcomingClass {
  _id: string;
  batchId: string;
  batchName: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  type: "live" | "recorded";
  joinUrl?: string;
  /** Source LiveClass id (Phase 19.2). */
  liveClassId?: string;
  endsAt?: string;
  recurrence?: "once" | "weekly" | "monthly";
  status?: "live_now" | "starting_soon" | "upcoming";
}

export interface StudentDashboardRoutineDay {
  batchId: string;
  batchName: string;
  days: {
    dayOfWeek: number;
    label: string;
    slots: { startTime: string; endTime: string; title?: string }[];
  }[];
}

export interface StudentDashboardAssignment {
  _id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  dueDate?: string;
  updatedAt: string;
  status: "pending" | "submitted" | "graded" | "returned" | "overdue";
  score?: number;
  maxScore?: number;
  grade?: string;
}

export interface StudentDashboardExam {
  _id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  startDate: string;
  endDate?: string;
  durationMinutes: number;
}

export interface StudentDashboardMetrics {
  attendance: {
    present: number;
    total: number;
    percentage: number;
  } | null;
  averageGrade: {
    percentage: number;
    label?: string;
    gradedItems: number;
  } | null;
  payments: {
    pendingAmount: number;
    pendingCount: number;
    paidAmount: number;
    lastPaidAt?: string;
    /** Monthly renewals currently due (grace or expired). */
    renewalDueCount?: number;
    renewalDueAmount?: number;
    renewalDueLabel?: string;
    renewalPhase?: "grace" | "expired";
  };
}

/** Composite — enrollments, progress, and batch academic widgets (Phase 17.7). */
export interface StudentDashboardComposite {
  enrollments: StudentDashboardEnrollment[];
  courseProgress: StudentDashboardCourseProgress[];
  batches: StudentDashboardBatchSummary[];
  upcomingClasses: StudentDashboardUpcomingClass[];
  weeklyRoutine: StudentDashboardRoutineDay[];
  assignments: StudentDashboardAssignment[];
  upcomingExams: StudentDashboardExam[];
  metrics: StudentDashboardMetrics;
}
