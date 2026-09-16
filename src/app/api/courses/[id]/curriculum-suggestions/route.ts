import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import { buildCourseCurriculumSuggestions } from "@/app/api/_lib/unifiedCourse";
import { isAdminAreaRole } from "@/lib/roles";

type RouteContext = { params: Promise<{ id: string }> };

type ManageableCourse = { instructor?: unknown; createdBy?: unknown };

function canManageCourse(
  course: ManageableCourse,
  userId: string,
  role: string,
): boolean {
  if (isAdminAreaRole(role)) return true;
  if (role !== "instructor") return false;
  const instructor = course?.instructor ? String(course.instructor) : "";
  const creator = course?.createdBy ? String(course.createdBy) : "";
  return instructor === userId || creator === userId;
}

/**
 * GET /api/courses/[id]/curriculum-suggestions?sourceCourseId=...
 * Returns the course-level chapter/lesson structure of a source course so the
 * curriculum builder can offer a selectable copy.
 */
export async function GET(request: NextRequest, context: RouteContext) {
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
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const { id } = await context.params;
    const sourceCourseId = new URL(request.url).searchParams
      .get("sourceCourseId")
      ?.trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }
    if (!sourceCourseId || !mongoose.Types.ObjectId.isValid(sourceCourseId)) {
      return NextResponse.json(
        { success: false, error: "Valid sourceCourseId is required" },
        { status: 400 },
      );
    }

    const target = await Course.findById(id)
      .select("_id instructor createdBy")
      .lean();
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }
    if (!canManageCourse(target, userId, role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const chapters = await buildCourseCurriculumSuggestions(sourceCourseId);
    return NextResponse.json({
      success: true,
      data: { sourceCourseId, targetCourseId: id, chapters },
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/curriculum-suggestions", error);
    return NextResponse.json(
      { success: false, error: "Failed to load curriculum suggestions" },
      { status: 500 },
    );
  }
}
