import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import Chapter from "@/models/Chapter";
import Lesson from "@/models/Lesson";
import Batch from "@/models/Batch";
import { hasPaidLiveCourseEnrollment } from "@/app/api/_lib/liveEnrollment";
import LiveClass from "@/models/LiveClass";
import ResourceWorksheet from "@/models/ResourceWorksheet";
import Assignment from "@/models/Assignment";
import BatchPracticeTest from "@/models/BatchPracticeTest";
import "@/models/Chapter";
import { filterChaptersWithLessons } from "@/lib/chapters/visibility";
import { resolveServingPdfUrl } from "@/app/api/_lib/resolveResourcePdfUrl";
import { resolveMeetLink } from "@/lib/meetLink";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function assertStudentCanAccessCourse(
  userId: string,
  courseId: string,
  batchId?: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (batchId) {
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return { ok: false, status: 400, error: "Invalid batch ID" };
    }

    const batch = await Batch.findById(batchId).select("_id courseId").lean();
    if (!batch) {
      return { ok: false, status: 404, error: "Batch not found" };
    }
    if (String(batch.courseId || "") !== courseId) {
      return {
        ok: false,
        status: 403,
        error: "Batch does not belong to this course",
      };
    }

    const enrolled = await hasPaidLiveCourseEnrollment(userId, courseId, batchId);
    if (!enrolled) {
      return {
        ok: false,
        status: 403,
        error: "You are not enrolled in this batch",
      };
    }
    return { ok: true };
  }

  const enrolled = await hasPaidLiveCourseEnrollment(userId, courseId);
  if (!enrolled) {
    return { ok: false, status: 403, error: "You are not enrolled in this course" };
  }

  return { ok: true };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id: courseId } = await params;
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Valid course ID is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const batchId = new URL(request.url).searchParams.get("batchId")?.trim() || "";
    const access = await assertStudentCanAccessCourse(userId, courseId, batchId || undefined);
    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    let batchMeetLink: string | undefined;
    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      const batchRow = await Batch.findById(batchId).select("meetLink").lean();
      batchMeetLink = resolveMeetLink(undefined, batchRow?.meetLink);
    }

    const course = await Course.findById(courseId)
      .select(
        "title shortDescription description thumbnailUrl category subjectName grade courseType status isPaid instructor",
      )
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    // Live curriculum is shared at the course level across all batches.
    // batchId is only for enrollment checks, meet links, and live-class rows —
    // never for hiding chapters/lessons/worksheets from other sections.
    // Enrolled students see full curriculum (draft + published). Public catalog
    // still uses isPublished filters separately.
    const chapterFilter: Record<string, unknown> = { course: courseId };
    const lessonFilter: Record<string, unknown> = { course: courseId };

    const [chapters, lessons, practiceTests] = await Promise.all([
      Chapter.find(chapterFilter).sort({ order: 1 }).limit(200).lean(),
      Lesson.find(lessonFilter)
        .populate("chapter", "title order")
        .sort({ order: 1 })
        .limit(2000)
        .lean(),
      BatchPracticeTest.find({
        course: courseId,
        status: "published",
        chapter: { $exists: true },
        ...(batchId
          ? {
              $or: [
                { batch: { $exists: false } },
                { batch: null },
                { batch: batchId },
              ],
            }
          : {
              $or: [{ batch: { $exists: false } }, { batch: null }],
            }),
      })
        .select(
          "_id title description chapter lesson durationMinutes totalMarks questions publishedAt",
        )
        .sort({ publishedAt: 1, createdAt: 1 })
        .limit(500)
        .lean(),
    ]);

    const lessonIds = lessons.map((lesson) => lesson._id);
    const liveClassIds = lessons
      .map((lesson) => lesson.liveClassId)
      .filter(Boolean);
    const worksheetFilter: Record<string, unknown> = {
      courseId,
      lessonId: { $in: lessonIds },
      isActive: true,
    };

    const assignmentFilter: Record<string, unknown> = {
      course: courseId,
      lesson: { $in: lessonIds },
      isActive: true,
      isPublished: true,
    };

    const [liveClasses, worksheets, assignments] = await Promise.all([
      liveClassIds.length
        ? LiveClass.find({
            _id: { $in: liveClassIds },
            ...(batchId ? { batchId } : {}),
            isActive: true,
          })
            .select(
              "_id title scheduledAt durationMinutes meetLink recordingUrl type",
            )
            .lean()
        : [],
      lessonIds.length
        ? ResourceWorksheet.find(worksheetFilter)
            .select("_id title lessonId")
            .lean()
        : [],
      lessonIds.length
        ? Assignment.find(assignmentFilter)
            .select("_id title lesson type totalMarks dueDate")
            .sort({ dueDate: 1, createdAt: 1 })
            .lean()
        : [],
    ]);

    const liveClassById = new Map(
      liveClasses.map((liveClass) => [String(liveClass._id), liveClass]),
    );
    const worksheetsByLessonId = new Map<string, typeof worksheets>();
    for (const worksheet of worksheets) {
      const key = String(worksheet.lessonId);
      const list = worksheetsByLessonId.get(key) || [];
      list.push(worksheet);
      worksheetsByLessonId.set(key, list);
    }
    const assignmentsByLessonId = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      const key = String(assignment.lesson);
      const list = assignmentsByLessonId.get(key) || [];
      list.push(assignment);
      assignmentsByLessonId.set(key, list);
    }

    // Only surface chapters the instructor has filled with at least one lesson.
    const visibleChapters = filterChaptersWithLessons(chapters, lessons);

    return NextResponse.json({
      success: true,
      data: {
        course: {
          ...course,
          _id: String(course._id),
          instructor: course.instructor ? String(course.instructor) : undefined,
        },
        chapters: visibleChapters.map((chapter) => ({
          ...chapter,
          _id: String(chapter._id),
          course: String(chapter.course),
          batchId: chapter.batchId ? String(chapter.batchId) : undefined,
          topicDriveUrl: chapter.topicDriveUrl || undefined,
        })),
        lessons: await Promise.all(
          lessons.map(async (lesson) => {
            const liveClass = lesson.liveClassId
              ? liveClassById.get(String(lesson.liveClassId))
              : undefined;
            const lessonWorksheets =
              worksheetsByLessonId.get(String(lesson._id)) || [];
            const lessonAssignments =
              assignmentsByLessonId.get(String(lesson._id)) || [];
            const worksheet = lessonWorksheets[0];
            const rawPdfUrl = lesson.pdfUrl ? String(lesson.pdfUrl) : "";
            const pdfUrl = rawPdfUrl
              ? await resolveServingPdfUrl(rawPdfUrl, null, request)
              : undefined;
            const rawAttachments: Array<{
              name?: string;
              url?: string;
              type?: string;
              size?: number;
            }> = Array.isArray(lesson.attachments)
              ? (lesson.attachments as Array<{
                  name?: string;
                  url?: string;
                  type?: string;
                  size?: number;
                }>)
              : [];
            const attachments = await Promise.all(
              rawAttachments.map(async (row) => {
                const url = row.url ? String(row.url) : "";
                const looksPdf =
                  String(row.type || "").toLowerCase().includes("pdf") ||
                  /\.pdf(?:$|[?#])/i.test(url) ||
                  url.includes("/uploads/pdf/") ||
                  url.includes("/api/files/pdf/");
                return {
                  ...row,
                  url:
                    url && looksPdf
                      ? await resolveServingPdfUrl(url, null, request)
                      : url,
                };
              }),
            );
            return {
              ...lesson,
              _id: String(lesson._id),
              course: String(lesson.course),
              batchId: lesson.batchId ? String(lesson.batchId) : undefined,
              liveClassId: lesson.liveClassId
                ? String(lesson.liveClassId)
                : undefined,
              liveClass: liveClass
                ? {
                    _id: String(liveClass._id),
                    title: liveClass.title,
                    scheduledAt: liveClass.scheduledAt,
                    durationMinutes: liveClass.durationMinutes,
                    meetLink: resolveMeetLink(liveClass.meetLink, batchMeetLink),
                    recordingUrl: liveClass.recordingUrl || undefined,
                    type: liveClass.type,
                  }
                : batchMeetLink && lesson.lessonType === "live"
                  ? {
                      _id: String(lesson._id),
                      title: lesson.title,
                      meetLink: batchMeetLink,
                      type: "live" as const,
                    }
                  : undefined,
              worksheet: worksheet
                ? {
                    _id: String(worksheet._id),
                    title: worksheet.title,
                  }
                : undefined,
              worksheets: lessonWorksheets.map((row) => ({
                _id: String(row._id),
                title: row.title,
              })),
              assignments: lessonAssignments.map((row) => ({
                _id: String(row._id),
                title: row.title,
                type: row.type,
                totalMarks: row.totalMarks,
                dueDate: row.dueDate,
              })),
              youtubeVideoId: lesson.youtubeVideoId || undefined,
              videoUrl: lesson.videoUrl || undefined,
              pdfUrl,
              attachments,
              chapter:
                lesson.chapter && typeof lesson.chapter === "object"
                  ? {
                      _id: String(
                        (lesson.chapter as { _id?: unknown })._id || "",
                      ),
                      title: (lesson.chapter as { title?: string }).title,
                      order: (lesson.chapter as { order?: number }).order,
                    }
                  : lesson.chapter
                    ? String(lesson.chapter)
                    : lesson.chapter,
            };
          }),
        ),
        tests: practiceTests.map((test) => ({
          _id: String(test._id),
          title: test.title,
          description: test.description || undefined,
          chapter: String(test.chapter),
          lesson: test.lesson ? String(test.lesson) : undefined,
          durationMinutes: test.durationMinutes,
          totalMarks: test.totalMarks,
          questionCount: Array.isArray(test.questions)
            ? test.questions.length
            : 0,
          publishedAt: test.publishedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Student curriculum error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load course curriculum" },
      { status: 500 },
    );
  }
}
