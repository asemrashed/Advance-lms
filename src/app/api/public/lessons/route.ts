import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import LiveClass from "@/models/LiveClass";
import ResourceWorksheet from "@/models/ResourceWorksheet";
import Assignment from "@/models/Assignment";
import BatchPracticeTest from "@/models/BatchPracticeTest";
import "@/models/Chapter";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") || searchParams.get("course");
    const chapterId =
      searchParams.get("chapterId") || searchParams.get("chapter");
    const batchId = searchParams.get("batchId")?.trim();
    const isPublishedParam = searchParams.get("isPublished");
    const limit = Number.parseInt(searchParams.get("limit") || "1000", 10);

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

    if (chapterId) {
      if (!mongoose.Types.ObjectId.isValid(chapterId)) {
        return NextResponse.json(
          { success: false, error: "Invalid chapter ID" },
          { status: 400 },
        );
      }
      filter.chapter = chapterId;
    }

    // Curriculum is shared at the course level. When a batchId is supplied we
    // still match legacy per-batch lessons for that batch, plus course-level
    // lessons (batchId not set) — after migration only the latter remain.
    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      filter.$or = [
        { batchId },
        { batchId: { $exists: false } },
        { batchId: null },
      ];
    }

    if (isPublishedParam === "true") {
      filter.isPublished = true;
    }

    const lessons = await Lesson.find(filter)
      .populate("chapter", "title order")
      .sort({ order: 1 })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 1000)
      .lean();

    const lessonIds = lessons.map((lesson) => lesson._id);
    const liveClassIds = lessons
      .map((lesson) => lesson.liveClassId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));

    const worksheetFilter: Record<string, unknown> = {
      courseId,
      lessonId: { $in: lessonIds },
      isActive: true,
    };
    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      worksheetFilter.$or = [
        { batchId },
        { batchId: { $exists: false } },
        { batchId: null },
      ];
    }

    const [worksheets, assignments, practiceTests, liveClasses] = await Promise.all([
      lessonIds.length
        ? ResourceWorksheet.find(worksheetFilter).select("_id title lessonId").lean()
        : [],
      lessonIds.length
        ? Assignment.find({
            course: courseId,
            lesson: { $in: lessonIds },
            isActive: true,
            isPublished: true,
          })
            .select("_id title lesson type totalMarks")
            .lean()
        : [],
      lessonIds.length
        ? BatchPracticeTest.find({
            course: courseId,
            status: "published",
            lesson: { $in: lessonIds },
          })
            .select("_id title lesson questions totalMarks durationMinutes")
            .lean()
        : [],
      liveClassIds.length
        ? LiveClass.find({ _id: { $in: liveClassIds }, isActive: { $ne: false } })
            .select("_id meetLink recordingUrl")
            .lean()
        : [],
    ]);

    const worksheetsByLesson = new Map<string, typeof worksheets>();
    for (const row of worksheets) {
      const key = String(row.lessonId);
      const list = worksheetsByLesson.get(key) || [];
      list.push(row);
      worksheetsByLesson.set(key, list);
    }
    const assignmentsByLesson = new Map<string, typeof assignments>();
    for (const row of assignments) {
      const key = String(row.lesson);
      const list = assignmentsByLesson.get(key) || [];
      list.push(row);
      assignmentsByLesson.set(key, list);
    }
    const testsByLesson = new Map<string, typeof practiceTests>();
    for (const row of practiceTests) {
      if (!row.lesson) continue;
      const key = String(row.lesson);
      const list = testsByLesson.get(key) || [];
      list.push(row);
      testsByLesson.set(key, list);
    }
    const liveById = new Map<
      string,
      { meetLink?: string; recordingUrl?: string }
    >();
    for (const row of liveClasses) {
      liveById.set(String(row._id), {
        meetLink: row.meetLink || undefined,
        recordingUrl: row.recordingUrl || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        lessons: lessons.map((lesson: any) => {
          const id = String(lesson._id);
          const lessonWorksheets = worksheetsByLesson.get(id) || [];
          const lessonAssignments = assignmentsByLesson.get(id) || [];
          const lessonTests = testsByLesson.get(id) || [];
          const live = lesson.liveClassId
            ? liveById.get(String(lesson.liveClassId))
            : undefined;
          const recordingUrl = live?.recordingUrl || undefined;
          const hasMeet = Boolean(live?.meetLink?.trim());
          const hasVideo = Boolean(
            lesson.youtubeVideoId ||
              lesson.videoUrl ||
              lesson.video ||
              recordingUrl,
          );
          const isFree = Boolean(lesson.isFree);
          // Only expose playable media URLs for free/public-preview lessons.
          const playableVideoUrl = isFree
            ? lesson.videoUrl || recordingUrl || undefined
            : undefined;
          const playableYoutubeId = isFree
            ? lesson.youtubeVideoId || undefined
            : undefined;

          return {
            _id: id,
            title: lesson.title,
            description: lesson.description,
            lessonType: lesson.lessonType,
            course: lesson.course ? String(lesson.course) : lesson.course,
            chapter:
              lesson.chapter && typeof lesson.chapter === "object"
                ? {
                    ...lesson.chapter,
                    _id: lesson.chapter._id
                      ? String(lesson.chapter._id)
                      : lesson.chapter._id,
                  }
                : lesson.chapter
                  ? String(lesson.chapter)
                  : lesson.chapter,
            order: lesson.order,
            duration: lesson.duration,
            videoDuration: lesson.videoDuration,
            pdfUrl: lesson.pdfUrl || undefined,
            isPublished: Boolean(lesson.isPublished),
            isFree,
            youtubeVideoId: playableYoutubeId,
            videoUrl: playableVideoUrl,
            attachments: Array.isArray(lesson.attachments)
              ? lesson.attachments
              : [],
            items: {
              // Live Class only when a Meet link was actually added.
              hasLive: hasMeet,
              // Recorded / class recording when a real video source exists.
              hasVideo,
              hasNotes: Boolean(lesson.pdfUrl),
              attachmentCount: Array.isArray(lesson.attachments)
                ? lesson.attachments.length
                : 0,
              worksheets: lessonWorksheets.map((row) => ({
                _id: String(row._id),
                title: row.title,
              })),
              assignments: lessonAssignments.map((row) => ({
                _id: String(row._id),
                title: row.title,
                type: row.type,
                totalMarks: row.totalMarks,
              })),
              tests: lessonTests.map((row) => ({
                _id: String(row._id),
                title: row.title,
                questionCount: Array.isArray(row.questions)
                  ? row.questions.length
                  : 0,
                totalMarks: row.totalMarks,
                durationMinutes: row.durationMinutes,
              })),
            },
          };
        }),
      },
    });
  } catch (error) {
    console.error("Error fetching public lessons:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch lessons" },
      { status: 500 },
    );
  }
}
