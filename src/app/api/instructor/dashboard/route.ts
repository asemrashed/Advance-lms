import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Course from "@/models/Course";
import CourseProgress from "@/models/CourseProgress";
import CourseReview from "@/models/CourseReview";
import Enrollment from "@/models/Enrollment";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { loadStaffBatchDashboardSummary } from "@/app/api/_lib/staffBatchDashboard";
import { hasCompleteBankDetails } from "@/lib/bankDetails";
import { getDisplayName } from "@/lib/displayName";

type RecentEnrollmentItem = {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  enrolledAt: string;
  status: string;
};

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

    if (role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();

    const instructorCourses = await Course.find({ instructor: userId })
      .sort({ createdAt: -1 })
      .lean();
    const totalCourses = instructorCourses.length;
    const courseIds = instructorCourses.map(
      (c) => c._id as mongoose.Types.ObjectId,
    );

    const [totalEnrollments, enrollmentStudentDocs, recentEnrollmentDocs] = await Promise.all([
      Enrollment.countDocuments({ course: { $in: courseIds } }),
      Enrollment.find({ course: { $in: courseIds } }).select("student").lean(),
      Enrollment.find({ course: { $in: courseIds } })
        .populate({ path: "student", select: "name email" })
        .populate({ path: "course", select: "title" })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const studentIds = new Set<string>();
    for (const row of enrollmentStudentDocs as Array<{ student?: unknown }>) {
      if (row.student) {
        studentIds.add(String(row.student));
      }
    }

    const recentEnrollments: RecentEnrollmentItem[] = (
      recentEnrollmentDocs as unknown as Record<string, unknown>[]
    ).map((row) => {
        const student = row.student as
          | { name?: string; email?: string }
          | undefined;
        const studentName = getDisplayName(student, "Unknown");
        const course = row.course as { title?: string } | undefined;

        return {
          id: String(row._id ?? ""),
          studentName,
          studentEmail: student?.email || "",
          courseTitle: course?.title || "Unknown",
          enrolledAt: new Date(
            (row.enrolledAt as Date | string | undefined) ?? new Date(),
          ).toISOString(),
          status: String(row.status ?? ""),
        };
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const [weeklyCompletions, previousWeeklyCompletions, successfulPayments, revenueRows, enrollmentTrendRows] =
      await Promise.all([
        CourseProgress.countDocuments({
          course: { $in: courseIds },
          status: "completed",
          updatedAt: { $gte: sevenDaysAgo },
        }),
        CourseProgress.countDocuments({
          course: { $in: courseIds },
          status: "completed",
          updatedAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
        }),
        Payment.countDocuments({
          course: { $in: courseIds },
          status: "success",
        }),
        Payment.aggregate([
          { $match: { course: { $in: courseIds }, status: "success" } },
          { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
        ]),
        Enrollment.aggregate([
          { $match: { course: { $in: courseIds } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 30 },
        ]),
      ]);

    const completionChange =
      previousWeeklyCompletions > 0
        ? Math.round(
            ((weeklyCompletions - previousWeeklyCompletions) /
              previousWeeklyCompletions) *
              100,
          )
        : weeklyCompletions > 0
          ? 100
          : 0;

    const enrollmentCounts = await Enrollment.aggregate<{
      _id: unknown;
      count: number;
    }>([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
    ]);
    const countByCourse = new Map(
      enrollmentCounts.map((row) => [String(row._id), Number(row.count || 0)]),
    );

    const courses = instructorCourses.map((course: Record<string, unknown>) => {
      const categoryRaw = course.category;
      const categoryName =
        typeof categoryRaw === "string" && categoryRaw.trim()
          ? categoryRaw.trim()
          : "General";
      return {
        _id: String(course._id ?? ""),
        title: String(course.title ?? ""),
        description: String(course.description ?? course.shortDescription ?? ""),
        thumbnailUrl: course.thumbnailUrl
          ? String(course.thumbnailUrl)
          : undefined,
        category: {
          _id: categoryName,
          name: categoryName,
        },
        studentCount: countByCourse.get(String(course._id)) ?? 0,
        averageRating: 0,
        totalLessons: Number(course.lessonCount ?? 0),
        createdAt: new Date(
          (course.createdAt as Date | string | undefined) ?? new Date(),
        ).toISOString(),
        status: String(course.status ?? "draft") as
          | "draft"
          | "published"
          | "archived",
        courseType: course.courseType === "live" ? ("live" as const) : ("recorded" as const),
      };
    });

    const studentRollups = await Enrollment.aggregate<{
      _id: unknown;
      enrolledCourses: number;
      lastActive: Date;
      lastEnrolled: Date;
    }>([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: "$student",
          enrolledCourses: { $sum: 1 },
          lastActive: {
            $max: { $ifNull: ["$lastAccessedAt", "$enrolledAt"] },
          },
          lastEnrolled: { $max: "$enrolledAt" },
        },
      },
      { $sort: { lastEnrolled: -1 } },
      { $limit: 12 },
    ]);

    const studentUserIds = studentRollups.map((r) => r._id);
    const studentUsers = await User.find({ _id: { $in: studentUserIds } })
      .select("name email avatar")
      .lean();
    const userById = new Map(
      studentUsers.map((u) => [String(u._id), u as Record<string, unknown>]),
    );

    const batchSummary = await loadStaffBatchDashboardSummary({
      instructorId: userId,
    });

    const students = studentRollups.map((rollup) => {
      const user = userById.get(String(rollup._id));
      return {
        _id: String(rollup._id),
        name: getDisplayName(user, "Student"),
        email: String(user?.email ?? ""),
        avatar: user?.avatar ? String(user.avatar) : undefined,
        enrolledCourses: Number(rollup.enrolledCourses ?? 0),
        lastActive: new Date(
          (rollup.lastActive as Date | undefined) ?? new Date(),
        ).toISOString(),
      };
    });

    const liveCourses = courses.filter((c) => c.courseType === "live");
    const recordedCourses = courses.filter((c) => c.courseType !== "live");
    const liveMongoIds = instructorCourses
      .filter((c: Record<string, unknown>) => c.courseType === "live")
      .map((c: Record<string, unknown>) => c._id as mongoose.Types.ObjectId);
    const recordedMongoIds = instructorCourses
      .filter((c: Record<string, unknown>) => c.courseType !== "live")
      .map((c: Record<string, unknown>) => c._id as mongoose.Types.ObjectId);

    const [liveStudentIds, recordedStudentIds, recordedRevenueRows] =
      await Promise.all([
        liveMongoIds.length
          ? Enrollment.distinct("student", { course: { $in: liveMongoIds } })
          : Promise.resolve([]),
        recordedMongoIds.length
          ? Enrollment.distinct("student", { course: { $in: recordedMongoIds } })
          : Promise.resolve([]),
        recordedMongoIds.length
          ? Payment.aggregate([
              {
                $match: {
                  status: "success",
                  course: { $in: recordedMongoIds },
                },
              },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ])
          : Promise.resolve([]),
      ]);

    const liveBatchIds = batchSummary.batches
      .map((b) => b._id)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const liveRevenueRows =
      liveBatchIds.length > 0 || liveMongoIds.length > 0
        ? await Payment.aggregate([
            {
              $match: {
                status: "success",
                $or: [
                  ...(liveBatchIds.length
                    ? [{ entityType: "batch" as const, batchId: { $in: liveBatchIds } }]
                    : []),
                  ...(liveMongoIds.length
                    ? [{ course: { $in: liveMongoIds } }]
                    : []),
                ],
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ])
        : [];

    const courseTypeMetrics = {
      live: {
        totalCourses: liveCourses.length,
        totalBatches: batchSummary.totalBatches,
        totalStudents: liveStudentIds.length,
        totalInstructors: 1,
        totalRevenue: Number(
          (liveRevenueRows as Array<{ total?: number }>)[0]?.total || 0,
        ),
      },
      recorded: {
        totalCourses: recordedCourses.length,
        totalBatches: 0,
        totalStudents: recordedStudentIds.length,
        totalInstructors: 1,
        totalRevenue: Number(
          (recordedRevenueRows as Array<{ total?: number }>)[0]?.total || 0,
        ),
      },
    };

    const assignmentIds =
      courseIds.length > 0
        ? await Assignment.distinct("_id", { course: { $in: courseIds } })
        : [];
    const [pendingSubmissions, averageRatingRows] = await Promise.all([
      assignmentIds.length
        ? AssignmentSubmission.countDocuments({
            assignment: { $in: assignmentIds },
            status: "submitted",
          })
        : Promise.resolve(0),
      courseIds.length
        ? CourseReview.aggregate<{ avg: number; count: number }>([
            {
              $match: {
                course: { $in: courseIds },
                isApproved: true,
              },
            },
            {
              $group: {
                _id: null,
                avg: { $avg: "$rating" },
                count: { $sum: 1 },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const ratingAvg = Number(
      (averageRatingRows as Array<{ avg?: number }>)[0]?.avg || 0,
    );

    const instructorUser = await User.findById(userId)
      .select("bankDetails")
      .lean();
    const profileComplete = hasCompleteBankDetails(instructorUser?.bankDetails);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCourses,
          totalStudents: studentIds.size,
          totalEnrollments,
          weeklyCompletions,
          completionChange,
          successfulPayments,
          totalRevenue: Number(revenueRows[0]?.totalRevenue || 0),
          pendingSubmissions: Number(pendingSubmissions || 0),
          averageRating: Math.round(ratingAvg * 10) / 10,
          reviewCount: Number(
            (averageRatingRows as Array<{ count?: number }>)[0]?.count || 0,
          ),
        },
        navBadges: {
          assignments:
            Number(pendingSubmissions || 0) > 0
              ? String(pendingSubmissions)
              : null,
          profile: profileComplete ? null : "Complete",
        },
        courseTypeMetrics,
        recentEnrollments,
        trends: {
          enrollments: enrollmentTrendRows.map((row) => ({
            _id: String(row._id || ""),
            count: Number(row.count || 0),
          })),
        },
        courses,
        students,
        batchSummary,
      },
    });
  } catch (error) {
    console.error("Instructor dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch instructor dashboard" },
      { status: 500 },
    );
  }
}
