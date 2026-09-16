import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import Chapter from "@/models/Chapter";
import { isAdminAreaRole } from "@/lib/roles";

export async function PUT(request: NextRequest) {
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
    const body = (await request.json()) as {
      courseId?: string;
      chapterOrders?: Array<{ chapterId: string; order: number }>;
    };

    const courseId = String(body.courseId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Valid course ID is required" },
        { status: 400 },
      );
    }
    const chapterOrders = Array.isArray(body.chapterOrders) ? body.chapterOrders : [];
    if (chapterOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: "chapterOrders is required" },
        { status: 400 },
      );
    }

    const course = await Course.findById(courseId)
      .select("_id instructor createdBy")
      .lean();
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }
    if (role === "instructor") {
      const canManage =
        String(course.instructor || "") === userId ||
        String(course.createdBy || "") === userId;
      if (!canManage) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
    }

    const chapterIds = chapterOrders
      .map((item) => item.chapterId)
      .filter((id): id is string => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (chapterIds.length !== chapterOrders.length) {
      return NextResponse.json(
        { success: false, error: "Invalid chapter ID in chapterOrders" },
        { status: 400 },
      );
    }

    const existing = await Chapter.countDocuments({
      _id: { $in: chapterIds },
      course: course._id,
    });
    if (existing !== chapterIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more chapters do not belong to course" },
        { status: 400 },
      );
    }

    await Promise.all(
      chapterOrders.map((item) =>
        Chapter.updateOne(
          { _id: item.chapterId, course: course._id },
          { $set: { order: item.order } },
        ),
      ),
    );

    return NextResponse.json({ success: true, data: { updated: chapterOrders.length } });
  } catch (error) {
    console.error("Chapter reorder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder chapters" },
      { status: 500 },
    );
  }
}
