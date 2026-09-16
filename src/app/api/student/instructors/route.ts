import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Batch from "@/models/Batch";
import BatchEnrollment from "@/models/BatchEnrollment";
import Course from "@/models/Course";
import CourseReview from "@/models/CourseReview";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import { getDisplayName } from "@/lib/displayName";

function unique(values: unknown[]) {
  return Array.from(
    new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
  );
}

function displayName(user: Record<string, unknown>) {
  return (
    getDisplayName(user) ||
    String(user.name ?? "").trim() ||
    "Instructor"
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (session.user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Student access required" },
        { status: 403 },
      );
    }

    await connectDB();

    const courses = await Course.find({
      status: "published",
      isHidden: { $ne: true },
      instructor: { $exists: true, $ne: null },
    })
      .select("title instructor subjectName category tags")
      .sort({ displayOrder: 1, title: 1 })
      .lean();

    const instructorIds = unique(courses.map((course) => course.instructor));
    const courseIds = courses.map((course) => course._id);

    const [users, ratingRows, directEnrollments, batchEnrollments] =
      await Promise.all([
        User.find({
          _id: { $in: instructorIds },
          role: "instructor",
          isActive: true,
          accountStatus: "active",
        })
          .select(
            "name avatar specialization experience bio",
          )
          .lean(),
        CourseReview.aggregate<{
          _id: string;
          averageRating: number;
          reviewCount: number;
        }>([
          {
            $match: {
              course: { $in: courseIds },
              isApproved: true,
              isPublic: true,
              isDisplayed: { $ne: false },
            },
          },
          {
            $lookup: {
              from: Course.collection.name,
              localField: "course",
              foreignField: "_id",
              as: "courseRow",
            },
          },
          { $unwind: "$courseRow" },
          {
            $match: {
              "courseRow.status": "published",
              "courseRow.isHidden": { $ne: true },
            },
          },
          {
            $group: {
              _id: "$courseRow.instructor",
              averageRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 },
            },
          },
        ]),
        Enrollment.find({
          student: session.user.id,
          paymentStatus: "paid",
          status: { $in: ["enrolled", "in_progress", "completed"] },
        })
          .select("course")
          .lean(),
        BatchEnrollment.find({
          studentId: session.user.id,
          paymentStatus: "paid",
          status: "active",
        })
          .select("batchId")
          .lean(),
      ]);

    const directCourseIds = new Set(
      directEnrollments.map((row) => String(row.course)),
    );
    const ownBatchIds = batchEnrollments.map((row) => row.batchId);
    const ownBatches = ownBatchIds.length
      ? await Batch.find({ _id: { $in: ownBatchIds }, isActive: true })
          .select("courseId instructorId instructorIds")
          .lean()
      : [];

    const enrolledInstructorIds = new Set<string>();
    for (const course of courses) {
      if (directCourseIds.has(String(course._id))) {
        enrolledInstructorIds.add(String(course.instructor));
      }
    }
    for (const batch of ownBatches) {
      if (batch.instructorId) {
        enrolledInstructorIds.add(String(batch.instructorId));
      }
      for (const id of batch.instructorIds ?? []) {
        enrolledInstructorIds.add(String(id));
      }
      if (batch.courseId) {
        const course = courses.find(
          (row) => String(row._id) === String(batch.courseId),
        );
        if (course?.instructor) {
          enrolledInstructorIds.add(String(course.instructor));
        }
      }
    }

    const coursesByInstructor = new Map<string, typeof courses>();
    for (const course of courses) {
      const key = String(course.instructor);
      const existing = coursesByInstructor.get(key) ?? [];
      existing.push(course);
      coursesByInstructor.set(key, existing);
    }
    const ratingsByInstructor = new Map(
      ratingRows.map((row) => [String(row._id), row]),
    );

    const data = users
      .map((user) => {
        const id = String(user._id);
        const instructorCourses = coursesByInstructor.get(id) ?? [];
        const rating = ratingsByInstructor.get(id);
        const subjects = unique(
          instructorCourses.flatMap((course) => [
            course.subjectName,
            course.category,
          ]),
        );
        const courseTags = unique(
          instructorCourses.flatMap((course) => [
            course.title,
            ...(course.tags ?? []),
          ]),
        );

        return {
          id,
          name: displayName(user as unknown as Record<string, unknown>),
          avatar: String(user.avatar ?? "").trim() || null,
          specialization:
            String(user.specialization ?? "").trim() || null,
          experience: String(user.experience ?? "").trim() || null,
          bio: String(user.bio ?? "").trim() || null,
          subjects,
          courseTags,
          courses: instructorCourses.map((course) => ({
            id: String(course._id),
            title: String(course.title),
          })),
          rating:
            rating && Number.isFinite(Number(rating.averageRating))
              ? Math.round(Number(rating.averageRating) * 10) / 10
              : null,
          reviewCount: Number(rating?.reviewCount ?? 0),
          isEnrolled: enrolledInstructorIds.has(id),
        };
      })
      .sort((a, b) => {
        if (a.isEnrolled !== b.isEnrolled) return a.isEnrolled ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      success: true,
      data: {
        subjects: unique(data.flatMap((row) => row.subjects)).sort((a, b) =>
          a.localeCompare(b),
        ),
        instructors: data,
      },
    });
  } catch (error) {
    console.error("GET /api/student/instructors", error);
    return NextResponse.json(
      { success: false, error: "Failed to load instructors" },
      { status: 500 },
    );
  }
}
