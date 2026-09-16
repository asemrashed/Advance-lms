import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import CourseAnnouncement from "@/models/CourseAnnouncement";
import Course from "@/models/Course";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { isAdminAreaRole } from "@/lib/roles";

type RouteContext = { params: Promise<{ id: string }> };

function canManageCourse(
  course: { instructor?: unknown; createdBy?: unknown },
  userId: string,
  role: string,
): boolean {
  if (isAdminAreaRole(role)) return true;
  if (role !== "instructor") return false;
  return (
    String(course.instructor ?? "") === userId ||
    String(course.createdBy ?? "") === userId
  );
}

function mapAnnouncement(row: {
  _id: unknown;
  courseId: unknown;
  title: string;
  body: string;
  liveSessionAt?: Date;
  liveSessionLink?: string;
  status: string;
  createdBy: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: String(row._id),
    courseId: String(row.courseId),
    title: row.title,
    body: row.body,
    liveSessionAt: row.liveSessionAt?.toISOString(),
    liveSessionLink: row.liveSessionLink || undefined,
    status: row.status,
    createdBy: String(row.createdBy),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
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

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const course = await Course.findById(id).select("_id courseType").lean();
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    const isStaff = isAdminAreaRole(role) || role === "instructor";
    const filter: Record<string, unknown> = { courseId: id };
    if (!isStaff) {
      filter.status = "published";
    }

    const announcements = await CourseAnnouncement.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        courseId: id,
        courseType: normalizeCourseType(course.courseType),
        announcements: announcements.map((row) => mapAnnouncement(row)),
      },
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/announcements", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch announcements" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const course = await Course.findById(id)
      .select("_id courseType instructor createdBy")
      .lean();
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }
    if (!canManageCourse(course, userId, role || "")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
    if (normalizeCourseType(course.courseType) !== "recorded") {
      return NextResponse.json(
        {
          success: false,
          error: "Announcements are only supported on recorded courses",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const announcementBody =
      typeof body.body === "string" ? body.body.trim() : "";
    if (!title || !announcementBody) {
      return NextResponse.json(
        { success: false, error: "title and body are required" },
        { status: 400 },
      );
    }

    const liveSessionAt =
      typeof body.liveSessionAt === "string" && body.liveSessionAt.trim()
        ? new Date(body.liveSessionAt)
        : undefined;
    if (liveSessionAt && Number.isNaN(liveSessionAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid liveSessionAt" },
        { status: 400 },
      );
    }

    const status =
      body.status === "published" || body.status === "archived"
        ? body.status
        : "draft";

    const announcement = await CourseAnnouncement.create({
      courseId: id,
      title,
      body: announcementBody,
      liveSessionAt,
      liveSessionLink:
        typeof body.liveSessionLink === "string"
          ? body.liveSessionLink.trim() || undefined
          : undefined,
      status,
      createdBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: mapAnnouncement(announcement.toObject()),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/courses/[id]/announcements", error);
    return NextResponse.json(
      { success: false, error: "Failed to create announcement" },
      { status: 500 },
    );
  }
}
