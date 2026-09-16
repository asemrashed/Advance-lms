import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import { authOptions } from "@/lib/auth";
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
      chapterId?: string;
      lessonOrders?: Array<{ lessonId: string; order: number }>;
    };

    const chapterId = String(body.chapterId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { success: false, error: "Valid chapter ID is required" },
        { status: 400 },
      );
    }
    const lessonOrders = Array.isArray(body.lessonOrders) ? body.lessonOrders : [];
    if (lessonOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: "lessonOrders is required" },
        { status: 400 },
      );
    }

    const chapter = await Chapter.findById(chapterId)
      .select("_id course")
      .lean();
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: "Chapter not found" },
        { status: 404 },
      );
    }

    const course = await Course.findById(chapter.course)
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

    const lessonIds = lessonOrders
      .map((item) => item.lessonId)
      .filter((id): id is string => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (lessonIds.length !== lessonOrders.length) {
      return NextResponse.json(
        { success: false, error: "Invalid lesson ID in lessonOrders" },
        { status: 400 },
      );
    }

    const existing = await Lesson.countDocuments({
      _id: { $in: lessonIds },
      chapter: chapter._id,
    });
    if (existing !== lessonIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more lessons do not belong to chapter" },
        { status: 400 },
      );
    }

    await Promise.all(
      lessonOrders.map((item) =>
        Lesson.updateOne(
          { _id: item.lessonId, chapter: chapter._id },
          { $set: { order: item.order } },
        ),
      ),
    );

    return NextResponse.json({ success: true, data: { updated: lessonOrders.length } });
  } catch (error) {
    console.error("Lesson reorder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder lessons" },
      { status: 500 },
    );
  }
}
