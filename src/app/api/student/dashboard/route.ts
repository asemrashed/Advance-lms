import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import "@/lib/registerMongooseModels";
import { authOptions } from "@/lib/auth";
import { INSTRUCTOR_USER_SELECT } from "@/app/api/_lib/instructorProfile";
import Enrollment from "@/models/Enrollment";
import CourseProgress from "@/models/CourseProgress";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Attendance from "@/models/Attendance";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import Payment from "@/models/Payment";
import { loadStudentBatchDashboardData } from "@/app/api/_lib/studentBatchDashboard";
import { computeDuePayments } from "@/app/api/_lib/duePayments";
import { getDisplayName } from "@/lib/displayName";
import type {
  StudentDashboardComposite,
  StudentDashboardCourse,
  StudentDashboardCourseProgress,
  StudentDashboardEnrollment,
} from "@/types/studentDashboard";

const COURSE_SELECT =
  "title shortDescription description thumbnailUrl category isPaid price instructor createdAt updatedAt";

function courseIdFromRef(courseField: unknown): string {
  if (
    courseField &&
    typeof courseField === "object" &&
    "_id" in (courseField as object)
  ) {
    return String((courseField as { _id: unknown })._id);
  }
  return String(courseField ?? "");
}

function mapCategory(
  category: string | undefined,
): StudentDashboardCourse["category"] {
  const name = category?.trim() || "General";
  return {
    _id: name.toLowerCase().replace(/\s+/g, "-") || "general",
    name,
  };
}

function mapInstructor(
  instructor: unknown,
): StudentDashboardCourse["instructor"] {
  if (instructor && typeof instructor === "object" && "_id" in instructor) {
    const user = instructor as Record<string, unknown>;
    return {
      _id: String(user._id ?? ""),
      name: getDisplayName(user),
    };
  }
  return { _id: "", name: "" };
}

function mapCourse(coursePop: Record<string, unknown>): StudentDashboardCourse {
  return {
    _id: String(coursePop._id ?? ""),
    title: String(coursePop.title ?? ""),
    description: String(
      coursePop.description ?? coursePop.shortDescription ?? "",
    ),
    thumbnailUrl: coursePop.thumbnailUrl
      ? String(coursePop.thumbnailUrl)
      : undefined,
    price: Number(coursePop.price) || 0,
    isPaid: Boolean(coursePop.isPaid),
    category: mapCategory(
      typeof coursePop.category === "string" ? coursePop.category : undefined,
    ),
    instructor: mapInstructor(coursePop.instructor),
    createdAt:
      coursePop.createdAt instanceof Date
        ? coursePop.createdAt.toISOString()
        : String(coursePop.createdAt ?? new Date(0).toISOString()),
    updatedAt:
      coursePop.updatedAt instanceof Date
        ? coursePop.updatedAt.toISOString()
        : String(coursePop.updatedAt ?? new Date(0).toISOString()),
  };
}

function mapEnrollment(row: Record<string, unknown>): StudentDashboardEnrollment {
  const coursePop =
    row.course && typeof row.course === "object"
      ? (row.course as Record<string, unknown>)
      : null;

  const enrolledAt =
    row.enrolledAt instanceof Date
      ? row.enrolledAt.toISOString()
      : String(row.enrolledAt ?? new Date(0).toISOString());

  const lastAccessedAt =
    row.lastAccessedAt instanceof Date
      ? row.lastAccessedAt.toISOString()
      : enrolledAt;

  return {
    _id: String(row._id ?? ""),
    course: coursePop ? mapCourse(coursePop) : mapCourse({}),
    enrolledAt,
    status: (row.status as StudentDashboardEnrollment["status"]) ?? "enrolled",
    progress: Number(row.progress) || 0,
    lastAccessedAt,
    paymentStatus:
      (row.paymentStatus as StudentDashboardEnrollment["paymentStatus"]) ??
      "pending",
  };
}

function mapCourseProgress(
  row: Record<string, unknown>,
): StudentDashboardCourseProgress {
  const status = row.status === "completed" ? "completed" : "in_progress";
  const isCompleted = status === "completed";
  const updatedAt =
    row.updatedAt instanceof Date
      ? row.updatedAt.toISOString()
      : String(row.updatedAt ?? new Date(0).toISOString());
  const createdAt =
    row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : String(row.createdAt ?? new Date(0).toISOString());

  return {
    _id: String(row._id ?? ""),
    course: courseIdFromRef(row.course),
    isCompleted,
    completedAt: isCompleted ? updatedAt : undefined,
    progressPercentage: Number(row.progressPercentage) || 0,
    totalLessons: Number(row.totalLessons) || 0,
    completedLessons: Number(row.completedLessons) || 0,
    totalTimeSpent: 0,
    lastAccessedAt: updatedAt,
    startedAt: createdAt,
  };
}

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function gradeLabel(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

/** GET /api/student/dashboard — enrollments + course progress for the signed-in student. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    if (role !== "student") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();

    const [enrollmentRows, progressRows, batchData] = await Promise.all([
      Enrollment.find({ student: userId })
        .populate({
          path: "course",
          select: COURSE_SELECT,
          populate: { path: "instructor", select: INSTRUCTOR_USER_SELECT },
        })
        .sort({ enrolledAt: -1 })
        .lean(),
      CourseProgress.find({ student: userId })
        .populate({ path: "course", select: "_id" })
        .sort({ updatedAt: -1 })
        .lean(),
      loadStudentBatchDashboardData(userId),
    ]);

    const courseProgress = progressRows.map((row) =>
      mapCourseProgress(row as Record<string, unknown>),
    );
    const progressByCourseId = new Map(
      courseProgress.map((cp) => [cp.course, cp]),
    );

    const enrollments = enrollmentRows.map((row) => {
      const enrollment = mapEnrollment(row as unknown as Record<string, unknown>);
      const cp = progressByCourseId.get(enrollment.course._id);
      if (!cp) return enrollment;

      const status = cp.isCompleted
        ? ("completed" as const)
        : cp.progressPercentage > 0
          ? ("in_progress" as const)
          : enrollment.status;

      return {
        ...enrollment,
        progress: cp.progressPercentage,
        status,
        lastAccessedAt: cp.lastAccessedAt || enrollment.lastAccessedAt,
      };
    });

    const courseIds = Array.from(
      new Set([
        ...enrollments.map((enrollment) => enrollment.course._id).filter(Boolean),
      ]),
    );

    const now = new Date();
    const [
      assignmentRows,
      examRows,
      attendanceRows,
      paymentRows,
      examAttemptRows,
      duePayments,
    ] = await Promise.all([
        courseIds.length
          ? Assignment.find({
              course: { $in: courseIds },
              isActive: true,
              isPublished: true,
            })
              .populate("course", "title")
              .sort({ dueDate: 1, updatedAt: -1 })
              .lean()
          : [],
        courseIds.length
          ? Exam.find({
              course: { $in: courseIds },
              isActive: true,
              isPublished: true,
              $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gte: now } },
              ],
            })
              .populate("course", "title")
              .sort({ startDate: 1, createdAt: -1 })
              .limit(5)
              .lean()
          : [],
        Attendance.find({ studentId: userId }).select("status").lean(),
        Payment.find({ user: userId, entityType: { $in: ["course", "batch"] } })
          .select("amount status createdAt")
          .sort({ createdAt: -1 })
          .lean(),
        ExamAttempt.find({
          student: userId,
          isSubmitted: true,
          status: { $in: ["completed", "pending_review"] },
        })
          .select("percentage")
          .lean(),
        computeDuePayments(userId).catch((err) => {
          console.error("dashboard computeDuePayments", err);
          return { due: [], payable: [] };
        }),
      ]);

    const assignmentIds = assignmentRows.map((assignment) => assignment._id);
    const submissionRows = assignmentIds.length
      ? await AssignmentSubmission.find({
          student: userId,
          assignment: { $in: assignmentIds },
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];
    const latestSubmissionByAssignment = new Map<string, Record<string, unknown>>();
    for (const submission of submissionRows) {
      const key = String(submission.assignment);
      if (!latestSubmissionByAssignment.has(key)) {
        latestSubmissionByAssignment.set(
          key,
          submission as unknown as Record<string, unknown>,
        );
      }
    }

    const assignments = assignmentRows.map((assignment) => {
      const row = assignment as unknown as Record<string, unknown>;
      const course =
        row.course && typeof row.course === "object"
          ? (row.course as Record<string, unknown>)
          : {};
      const submission = latestSubmissionByAssignment.get(String(row._id));
      const submissionStatus = String(submission?.status ?? "");
      const dueDateIso = iso(row.dueDate);
      const isOverdue =
        !submissionStatus &&
        Boolean(dueDateIso && new Date(dueDateIso).getTime() < now.getTime());
      const status =
        submissionStatus === "graded"
          ? ("graded" as const)
          : submissionStatus === "returned"
            ? ("returned" as const)
            : submissionStatus === "submitted"
              ? ("submitted" as const)
              : isOverdue
                ? ("overdue" as const)
                : ("pending" as const);
      return {
        _id: String(row._id ?? ""),
        title: String(row.title ?? ""),
        courseId: String(course._id ?? row.course ?? ""),
        courseTitle: String(course.title ?? "Course"),
        dueDate: dueDateIso,
        updatedAt: iso(submission?.updatedAt ?? row.updatedAt) ?? "",
        status,
        score:
          typeof submission?.score === "number" ? submission.score : undefined,
        maxScore:
          typeof submission?.maxScore === "number"
            ? submission.maxScore
            : Number(row.totalMarks) || undefined,
        grade:
          typeof submission?.grade === "string" ? submission.grade : undefined,
      };
    });

    const gradedPercentages = [
      ...submissionRows
        .filter((submission) => submission.status === "graded")
        .map((submission) => Number(submission.percentageScore))
        .filter(Number.isFinite),
      ...examAttemptRows
        .map((attempt) => Number(attempt.percentage))
        .filter(Number.isFinite),
    ];
    const averagePercentage =
      gradedPercentages.length > 0
        ? Math.round(
            gradedPercentages.reduce((sum, value) => sum + value, 0) /
              gradedPercentages.length,
          )
        : null;
    const present = attendanceRows.filter(
      (attendance) => attendance.status === "present",
    ).length;
    const pendingPayments = paymentRows.filter(
      (payment) => payment.status === "pending",
    );
    const successfulPayments = paymentRows.filter(
      (payment) => payment.status === "success",
    );

    const data: StudentDashboardComposite = {
      enrollments,
      courseProgress,
      batches: batchData.batches,
      upcomingClasses: batchData.upcomingClasses,
      weeklyRoutine: batchData.weeklyRoutine,
      assignments,
      upcomingExams: examRows.map((exam) => {
        const row = exam as unknown as Record<string, unknown>;
        const course =
          row.course && typeof row.course === "object"
            ? (row.course as Record<string, unknown>)
            : {};
        return {
          _id: String(row._id ?? ""),
          title: String(row.title ?? ""),
          courseId: String(course._id ?? row.course ?? ""),
          courseTitle: String(course.title ?? "Course"),
          startDate: iso(row.startDate) ?? "",
          endDate: iso(row.endDate),
          durationMinutes: Number(row.duration) || 0,
        };
      }),
      metrics: {
        attendance:
          attendanceRows.length > 0
            ? {
                present,
                total: attendanceRows.length,
                percentage: Math.round((present / attendanceRows.length) * 100),
              }
            : null,
        averageGrade:
          averagePercentage == null
            ? null
            : {
                percentage: averagePercentage,
                label: gradeLabel(averagePercentage),
                gradedItems: gradedPercentages.length,
              },
        payments: (() => {
          const renewals = duePayments.due.filter((d) => d.reason === "renewal");
          const renewalDueAmount = renewals.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0,
          );
          const hasExpired = renewals.some((r) => r.phase === "expired");
          const primary = renewals[0];
          return {
            pendingAmount: pendingPayments.reduce(
              (sum, payment) => sum + Number(payment.amount || 0),
              0,
            ),
            pendingCount: pendingPayments.length,
            paidAmount: successfulPayments.reduce(
              (sum, payment) => sum + Number(payment.amount || 0),
              0,
            ),
            lastPaidAt: iso(successfulPayments[0]?.createdAt),
            renewalDueCount: renewals.length,
            renewalDueAmount,
            renewalDueLabel: primary?.title,
            renewalPhase: renewals.length
              ? hasExpired
                ? ("expired" as const)
                : ("grace" as const)
              : undefined,
          };
        })(),
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/student/dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch student dashboard" },
      { status: 500 },
    );
  }
}
