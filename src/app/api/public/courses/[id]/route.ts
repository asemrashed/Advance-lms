import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import { authOptions } from "@/lib/auth";
import {
  getInstructorDisplayName,
  getInstructorStats,
  INSTRUCTOR_USER_SELECT,
  mapInstructorProfile,
} from "@/app/api/_lib/instructorProfile";
import { isAdminAreaRole } from "@/lib/roles";
import {
  coursePricingFromLean,
  resolveCourseDiscountPercentage,
  resolveCourseFinalPrice,
} from "@/lib/courses/liveCoursePricing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const course = await Course.findOne({
      _id: id,
      status: "published",
      isHidden: { $ne: true },
    })
      .populate("instructor", INSTRUCTOR_USER_SELECT)
      .populate("createdBy", INSTRUCTOR_USER_SELECT)
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found or not published" },
        { status: 404 },
      );
    }

    const courseData = course as Record<string, unknown>;
    const pricing = coursePricingFromLean(courseData);
    const finalPrice = resolveCourseFinalPrice(pricing);
    const discountPercentage = resolveCourseDiscountPercentage(pricing);

    const instructorUser =
      (courseData.instructor as Record<string, unknown> | null) ||
      (courseData.createdBy as Record<string, unknown> | null);

    const createdByRaw = courseData.createdBy as Record<string, unknown> | null;
    const createdBy = createdByRaw?._id
      ? {
          _id: String(createdByRaw._id),
          name: getInstructorDisplayName(createdByRaw),
          role: String(createdByRaw.role || "instructor"),
          email: createdByRaw.email
            ? String(createdByRaw.email)
            : undefined,
        }
      : {
          _id: "",
          name: "Unknown",
          role: "instructor",
        };

    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const userId = session?.user?.id ? String(session.user.id) : "";
    const ownerId = instructorUser?._id
      ? String(instructorUser._id)
      : createdBy._id;
    const canSeeStudentCount =
      isAdminAreaRole(role) ||
      (role === "instructor" && Boolean(userId) && userId === ownerId);

    let instructor:
      | (ReturnType<typeof mapInstructorProfile> & {
          coursesCount: number;
          rating: number;
          studentsCount?: number;
        })
      | undefined;

    if (instructorUser?._id) {
      const profile = mapInstructorProfile(instructorUser);
      const stats = await getInstructorStats(profile._id);
      instructor = {
        ...profile,
        coursesCount: stats.coursesCount,
        rating: stats.rating,
        ...(canSeeStudentCount ? { studentsCount: stats.studentsCount } : {}),
      };
    }

    const {
      enrollmentCount: _hiddenEnrollmentCount,
      ...publicCourseFields
    } = courseData;

    return NextResponse.json({
      success: true,
      data: {
        ...publicCourseFields,
        _id: String(courseData._id),
        status: "published",
        finalPrice,
        discountPercentage,
        ...(canSeeStudentCount
          ? {
              enrollmentCount:
                typeof courseData.enrollmentCount === "number"
                  ? courseData.enrollmentCount
                  : 0,
            }
          : {}),
        createdBy,
        instructor,
      },
    });
  } catch (error) {
    console.error("Error fetching public course:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch course" },
      { status: 500 },
    );
  }
}
