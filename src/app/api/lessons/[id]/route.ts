import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Lesson from "@/models/Lesson";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import { normalizeLessonType } from "@/lib/courses/unifiedCourse";
import {
  assertBatchBelongsToCourse,
  loadCourseOrThrow,
  validateLessonCreateInput,
} from "@/app/api/_lib/unifiedCourse";
import { normalizeYoutubeVideoId } from "@/lib/youtube";
import { isAdminAreaRole } from "@/lib/roles";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function canManageLesson(
  lesson: { course?: unknown },
  userId: string,
  role: string,
) {
  if (isAdminAreaRole(role)) {
    return true;
  }
  const course = await Course.findById(lesson.course)
    .select("_id instructor createdBy")
    .lean();
  if (!course) {
    return false;
  }
  return (
    String(course.instructor || "") === userId ||
    String(course.createdBy || "") === userId
  );
}

function mapLesson(lesson: Record<string, unknown>) {
  const chapter = lesson.chapter;
  return {
    _id: String(lesson._id),
    title: (lesson.title as string) || "",
    description: (lesson.description as string) || undefined,
    content: (lesson.content as string) || undefined,
    chapter:
      chapter && typeof chapter === "object"
        ? {
            _id: String((chapter as { _id?: unknown })._id || ""),
            title: (chapter as { title?: string }).title || undefined,
            order:
              typeof (chapter as { order?: unknown }).order === "number"
                ? (chapter as { order: number }).order
                : undefined,
          }
        : String(chapter),
    course: String(lesson.course),
    batchId: lesson.batchId ? String(lesson.batchId) : undefined,
    lessonType: normalizeLessonType(lesson.lessonType),
    pdfUrl: (lesson.pdfUrl as string) || undefined,
    liveClassId: lesson.liveClassId ? String(lesson.liveClassId) : undefined,
    order: typeof lesson.order === "number" ? lesson.order : 0,
    duration: typeof lesson.duration === "number" ? lesson.duration : undefined,
    youtubeVideoId: (lesson.youtubeVideoId as string) || undefined,
    videoUrl: (lesson.videoUrl as string) || undefined,
    videoDuration:
      typeof lesson.videoDuration === "number"
        ? lesson.videoDuration
        : undefined,
    attachments: Array.isArray(lesson.attachments) ? lesson.attachments : [],
    isPublished: Boolean(lesson.isPublished),
    isFree: Boolean(lesson.isFree),
    youtubeEmbedUrl: (lesson.youtubeEmbedUrl as string) || undefined,
    youtubeThumbnailUrl: (lesson.youtubeThumbnailUrl as string) || undefined,
    youtubeWatchUrl: (lesson.youtubeWatchUrl as string) || undefined,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid lesson ID" },
        { status: 400 },
      );
    }

    const existing = await Lesson.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 },
      );
    }
    const allowed = await canManageLesson(existing, userId, role || "");
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};
    if (typeof body.title === "string") updateData.title = body.title.trim();
    if (typeof body.description === "string") {
      updateData.description = body.description.trim();
    }
    if (typeof body.content === "string") {
      updateData.content = body.content.trim();
    }
    if (typeof body.order === "number" && body.order > 0) {
      updateData.order = body.order;
    }
    if (typeof body.duration === "number" && body.duration >= 0) {
      updateData.duration = body.duration;
    }
    if (typeof body.youtubeVideoId === "string" || typeof body.videoUrl === "string") {
      const nextYoutube = normalizeYoutubeVideoId(
        typeof body.youtubeVideoId === "string"
          ? body.youtubeVideoId
          : (existing.youtubeVideoId as string | undefined),
        typeof body.videoUrl === "string" ? body.videoUrl : "",
      );
      updateData.youtubeVideoId = nextYoutube || undefined;
      if (typeof body.youtubeVideoId === "string" && body.youtubeVideoId.trim() && !nextYoutube) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid YouTube URL or video ID. Paste a full YouTube link or the 11-character ID.",
          },
          { status: 400 },
        );
      }
    }
    if (typeof body.videoUrl === "string") {
      const raw = body.videoUrl.trim();
      updateData.videoUrl =
        raw && !normalizeYoutubeVideoId(undefined, raw) ? raw : undefined;
    }
    if (typeof body.videoDuration === "number" && body.videoDuration >= 0) {
      updateData.videoDuration = body.videoDuration;
    }
    if (Array.isArray(body.attachments)) {
      updateData.attachments = body.attachments;
    }
    if (typeof body.isPublished === "boolean") {
      updateData.isPublished = body.isPublished;
    }
    if (typeof body.isFree === "boolean") {
      updateData.isFree = body.isFree;
    }
    if (typeof body.pdfUrl === "string") {
      updateData.pdfUrl = body.pdfUrl.trim() || undefined;
    }

    const nextLessonType =
      body.lessonType !== undefined
        ? normalizeLessonType(body.lessonType)
        : normalizeLessonType(existing.lessonType);
    if (body.lessonType !== undefined) {
      updateData.lessonType = nextLessonType;
    }

    const nextBatchId =
      typeof body.batchId === "string"
        ? body.batchId.trim()
        : existing.batchId
          ? String(existing.batchId)
          : "";
    if (typeof body.batchId === "string") {
      updateData.batchId = nextBatchId || undefined;
    }

    if (body.liveClassId !== undefined || body.lessonType !== undefined) {
      if (nextLessonType !== "live") {
        updateData.liveClassId = undefined;
      } else if (typeof body.liveClassId === "string") {
        updateData.liveClassId = body.liveClassId.trim() || undefined;
      }
    }

    if (
      body.lessonType !== undefined ||
      typeof body.batchId === "string"
    ) {
      const course = await loadCourseOrThrow(String(existing.course));
      const chapter = await Chapter.findById(existing.chapter)
        .select("_id batchId")
        .lean();
      const lessonScopeError = validateLessonCreateInput({
        courseType: course.courseType,
        lessonType: nextLessonType,
        batchId: nextBatchId || undefined,
        chapterBatchId: chapter?.batchId ? String(chapter.batchId) : undefined,
      });
      if (lessonScopeError) {
        return NextResponse.json(
          { success: false, error: lessonScopeError },
          { status: 400 },
        );
      }
      if (nextBatchId) {
        try {
          await assertBatchBelongsToCourse(nextBatchId, String(existing.course));
        } catch {
          return NextResponse.json(
            { success: false, error: "Batch not found for this course" },
            { status: 400 },
          );
        }
      }
    }

    const updated = await Lesson.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    )
      .populate("chapter", "title order")
      .lean();

    return NextResponse.json({
      success: true,
      data: mapLesson((updated || {}) as Record<string, unknown>),
    });
  } catch (error) {
    console.error("Lesson update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update lesson" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid lesson ID" },
        { status: 400 },
      );
    }

    const existing = await Lesson.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 },
      );
    }
    const allowed = await canManageLesson(existing, userId, role || "");
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await Lesson.findByIdAndDelete(id);
    return NextResponse.json({ success: true, data: { _id: id } });
  } catch (error) {
    console.error("Lesson delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete lesson" },
      { status: 500 },
    );
  }
}
