import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Chapter from "@/models/Chapter";
import Lesson from "@/models/Lesson";
import { filterChaptersWithLessons } from "@/lib/chapters/visibility";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") || searchParams.get("course");
    // batchId query param is accepted for backward compatibility but ignored —
    // live curriculum is shared across all batches of a course.
    const isPublishedParam = searchParams.get("isPublished");
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Valid course ID is required" },
        { status: 400 },
      );
    }

    const course = await Course.findOne({
      _id: courseId,
      status: "published",
      isHidden: { $ne: true },
    })
      .select("_id")
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found or not published" },
        { status: 404 },
      );
    }

    const filter: Record<string, unknown> = { course: courseId };
    if (isPublishedParam === "true") {
      filter.isPublished = true;
    }

    const lessonFilter: Record<string, unknown> = { course: courseId };
    // Chapter visibility is based on whether the instructor added lessons,
    // not on lesson.isPublished (curriculum builder creates live lessons as draft).

    const [chapters, lessons] = await Promise.all([
      Chapter.find(filter)
        .populate("course", "title")
        .sort({ order: 1 })
        .limit(Number.isFinite(limit) && limit > 0 ? limit : 100)
        .lean(),
      Lesson.find(lessonFilter).select("chapter").lean(),
    ]);

    // Hide blank chapters until the instructor adds lessons/content.
    const visible = filterChaptersWithLessons(chapters, lessons);

    return NextResponse.json({
      success: true,
      data: {
        chapters: visible.map((chapter: any) => ({
          ...chapter,
          _id: String(chapter._id),
          course: chapter.course ? String(chapter.course) : chapter.course,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching public chapters:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chapters" },
      { status: 500 },
    );
  }
}
