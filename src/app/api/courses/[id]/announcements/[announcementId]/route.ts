import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import CourseAnnouncement from "@/models/CourseAnnouncement";
import Course from "@/models/Course";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { isAdminAreaRole } from "@/lib/roles";

type RouteContext = { params: Promise<{ id: string; announcementId: string }> };

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

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const { id, announcementId } = await context.params;
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(announcementId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 },
      );
    }

    const course = await Course.findById(id)
      .select("_id instructor createdBy")
      .lean();
    if (!course || !canManageCourse(course, userId, role || "")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.body === "string") updates.body = body.body.trim();
    if (typeof body.liveSessionLink === "string") {
      updates.liveSessionLink = body.liveSessionLink.trim() || undefined;
    }
    if (body.liveSessionAt === null) {
      updates.liveSessionAt = undefined;
    } else if (typeof body.liveSessionAt === "string" && body.liveSessionAt) {
      const parsed = new Date(body.liveSessionAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { success: false, error: "Invalid liveSessionAt" },
          { status: 400 },
        );
      }
      updates.liveSessionAt = parsed;
    }
    if (
      body.status === "draft" ||
      body.status === "published" ||
      body.status === "archived"
    ) {
      updates.status = body.status;
    }

    const announcement = await CourseAnnouncement.findOneAndUpdate(
      { _id: announcementId, courseId: id },
      { $set: updates },
      { new: true },
    ).lean();
    if (!announcement) {
      return NextResponse.json(
        { success: false, error: "Announcement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: String(announcement._id),
        courseId: String(announcement.courseId),
        title: announcement.title,
        body: announcement.body,
        liveSessionAt: announcement.liveSessionAt?.toISOString(),
        liveSessionLink: announcement.liveSessionLink || undefined,
        status: announcement.status,
        createdBy: String(announcement.createdBy),
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/courses/[id]/announcements/[announcementId]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update announcement" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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
    const { id, announcementId } = await context.params;

    const course = await Course.findById(id)
      .select("_id instructor createdBy")
      .lean();
    if (!course || !canManageCourse(course, userId, role || "")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const deleted = await CourseAnnouncement.findOneAndDelete({
      _id: announcementId,
      courseId: id,
    }).lean();
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Announcement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true, _id: announcementId },
    });
  } catch (error) {
    console.error("DELETE /api/courses/[id]/announcements/[announcementId]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete announcement" },
      { status: 500 },
    );
  }
}
