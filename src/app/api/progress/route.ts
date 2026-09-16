import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Lesson from "@/models/Lesson";
import CourseProgress, {
  type ILessonProgressEntry,
} from "@/models/CourseProgress";
import { ensureStudentCourseAccess } from "@/app/api/_lib/studentEnrollment";
import { toObjectId } from "@/app/api/_lib/lessonQuiz";
const COURSE_SELECT =
  "title shortDescription thumbnailUrl category isPaid price status";

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function serializeCourseProgress(doc: {
  _id: unknown;
  student: unknown;
  course: unknown;
  lessonProgress: Array<{
    lesson: unknown;
    completed: boolean;
    completedAt?: Date;
  }>;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const coursePop =
    doc.course && typeof doc.course === "object" && "_id" in (doc.course as object)
      ? (doc.course as Record<string, unknown>)
      : null;

  const courseSummary = coursePop
    ? {
        _id: String(coursePop._id),
        title: coursePop.title as string | undefined,
        shortDescription: coursePop.shortDescription as string | undefined,
        thumbnailUrl: coursePop.thumbnailUrl as string | undefined,
        category: coursePop.category as string | undefined,
        isPaid: Boolean(coursePop.isPaid),
        price: coursePop.price as number | undefined,
        status: coursePop.status as string | undefined,
      }
    : doc.course;

  return {
    _id: String(doc._id),
    student: String(doc.student),
    course: courseSummary,
    lessonProgress: doc.lessonProgress.map((lp) => ({
      lesson: String(lp.lesson),
      completed: lp.completed,
      completedAt: lp.completedAt?.toISOString(),
    })),
    completedLessons: doc.completedLessons,
    totalLessons: doc.totalLessons,
    progressPercentage: doc.progressPercentage,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** GET /api/progress — all course progress rows for the signed-in student. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectDB();

    const rows = await CourseProgress.find({ student: userId })
      .populate({
        path: "course",
        select: COURSE_SELECT,
      })
      .sort({ updatedAt: -1 })
      .lean();

    const data = rows.map((row) =>
      serializeCourseProgress(
        row as unknown as Parameters<typeof serializeCourseProgress>[0],
      ),
    );

    return NextResponse.json({
      success: true,
      data: { progress: data },
    });
  } catch (error) {
    console.error("GET /api/progress error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
}

type PostBody = {
  courseId?: string;
  lessonId?: string;
};

function recalcFromLessonProgress(
  lessonProgress: Array<{ completed: boolean }>,
  totalLessons: number,
): {
  completedLessons: number;
  progressPercentage: number;
  status: "in_progress" | "completed";
} {
  const completedLessons = lessonProgress.filter((l) => l.completed).length;
  const progressPercentage =
    totalLessons > 0
      ? Math.min(
          100,
          Math.round((completedLessons / totalLessons) * 100),
        )
      : 0;
  const status: "in_progress" | "completed" =
    totalLessons > 0 && completedLessons >= totalLessons
      ? "completed"
      : "in_progress";
  return { completedLessons, progressPercentage, status };
}

/** POST /api/progress — mark a lesson complete and refresh aggregates. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as PostBody;
    const courseId =
      typeof body.courseId === "string" ? body.courseId.trim() : "";
    const lessonId =
      typeof body.lessonId === "string" ? body.lessonId.trim() : "";

    if (!courseId || !lessonId) {
      return NextResponse.json(
        { success: false, error: "courseId and lessonId are required" },
        { status: 400 },
      );
    }

    if (!isValidObjectId(courseId) || !isValidObjectId(lessonId)) {
      return NextResponse.json(
        { success: false, error: "Invalid courseId or lessonId" },
        { status: 400 },
      );
    }

    await connectDB();

    const course = await Course.findOne({
      _id: courseId,
      status: "published",
      isHidden: { $ne: true },
    })
      .select("_id")
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found or not available" },
        { status: 404 },
      );
    }

    const lesson = await Lesson.findOne({
      _id: lessonId,
      course: courseId,
      isPublished: true,
    })
      .select("_id course")
      .lean();

    if (!lesson) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson not found, not published, or not part of this course",
        },
        { status: 404 },
      );
    }

    const access = await ensureStudentCourseAccess(userId, courseId);
    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const studentOid = toObjectId(userId)!;
    const courseOid = toObjectId(courseId)!;

    const totalLessons = await Lesson.countDocuments({
      course: courseId,
      isPublished: true,
    });

    // Use findOneAndUpdate with upsert to avoid race conditions
    let doc;
    try {
      doc = await CourseProgress.findOneAndUpdate(
        {
          student: studentOid,
          course: courseOid,
        },
        {
          $setOnInsert: {
            lessonProgress: [],
            completedLessons: 0,
            totalLessons,
            progressPercentage: 0,
            status: "in_progress",
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (upsertError: unknown) {
      // Handle E11000 duplicate key error - try to fetch existing document
      if (
        upsertError instanceof Error &&
        upsertError.message.includes("E11000")
      ) {
        console.warn(
          "E11000 error during upsert, attempting to fetch existing document",
          { userId, courseId }
        );
        doc = await CourseProgress.findOne({
          student: studentOid,
          course: courseOid,
        });
        
        if (!doc) {
          // If still not found, it's a genuine error
          throw upsertError;
        }
      } else {
        throw upsertError;
      }
    }

    if (!doc) {
      throw new Error("Failed to create or retrieve course progress");
    }

    const lessonObjectId = new mongoose.Types.ObjectId(lessonId);
    
    // Check if lesson is already in progress
    const lessonExists = doc.lessonProgress?.some(
      (lp: ILessonProgressEntry) => String(lp.lesson) === lessonId && lp.completed
    );

    // If lesson already completed, just return current state
    if (lessonExists) {
      const populated = await CourseProgress.findById(doc._id)
        .populate({ path: "course", select: COURSE_SELECT })
        .lean();

      if (!populated) {
        return NextResponse.json(
          { success: false, error: "Failed to load progress" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: serializeCourseProgress(
          populated as unknown as Parameters<typeof serializeCourseProgress>[0],
        ),
      });
    }

    // Update or add lesson progress
    const idx = doc.lessonProgress.findIndex(
      (lp: ILessonProgressEntry) => String(lp.lesson) === lessonId,
    );

    if (idx >= 0) {
      // Lesson exists but not completed - mark it completed
      await CourseProgress.findOneAndUpdate(
        { _id: doc._id },
        {
          $set: {
            [`lessonProgress.${idx}.completed`]: true,
            [`lessonProgress.${idx}.completedAt`]: new Date(),
          },
        }
      );
    } else {
      // Add new lesson to progress
      await CourseProgress.findOneAndUpdate(
        { _id: doc._id },
        {
          $push: {
            lessonProgress: {
              lesson: lessonObjectId,
              completed: true,
              completedAt: new Date(),
            },
          },
        }
      );
    }

    // Re-fetch and recalculate all progress stats
    doc = await CourseProgress.findById(doc._id);
    
    if (!doc) {
      throw new Error("Failed to retrieve updated progress");
    }

    doc.totalLessons = totalLessons;
    const { completedLessons, progressPercentage, status } =
      recalcFromLessonProgress(doc.lessonProgress, totalLessons);
    doc.completedLessons = completedLessons;
    doc.progressPercentage = progressPercentage;
    doc.status = status;

    // Update all calculated fields atomically
    doc = await CourseProgress.findOneAndUpdate(
      { _id: doc._id },
      {
        $set: {
          completedLessons,
          progressPercentage,
          status,
          totalLessons,
        },
      },
      { new: true }
    );

    const enrollmentUpdate: Record<string, unknown> = {
      progress: doc.progressPercentage,
    };
    if (status === "completed") {
      enrollmentUpdate.status = "completed";
    }

    const enrollmentDoc = await Enrollment.findOneAndUpdate(
      { student: studentOid, course: courseOid },
      { $set: enrollmentUpdate },
      { new: true },
    );

    const populated = await CourseProgress.findById(doc._id)
      .populate({ path: "course", select: COURSE_SELECT })
      .lean();

    if (!populated) {
      return NextResponse.json(
        { success: false, error: "Failed to load progress" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeCourseProgress(
        populated as unknown as Parameters<typeof serializeCourseProgress>[0],
      ),
    });
  } catch (error: unknown) {
    console.error("POST /api/progress error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update progress" },
      { status: 500 },
    );
  }
}
