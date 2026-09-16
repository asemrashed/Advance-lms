import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import Batch from "@/models/Batch";
import CourseProgress from "@/models/CourseProgress";
import Course from "@/models/Course";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";

const ACTIVE_STATUSES = ["enrolled", "in_progress", "completed"];

type LeanBatch = {
  _id: unknown;
  name?: string;
  courseId?: unknown;
  grade?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  startDate?: Date;
  endDate?: Date;
};

function isPopulatedCourse(
  value: unknown,
): value is Record<string, unknown> & { _id?: unknown } {
  return Boolean(value && typeof value === "object" && "_id" in (value as object));
}

function resolveBatchForLiveEnrollment(
  courseId: string,
  selectedBatchId: unknown,
  batchById: Map<string, LeanBatch>,
  batchesByCourseId: Map<string, LeanBatch[]>,
): { batchId: string; batch: LeanBatch | undefined } {
  const explicitBatchId = selectedBatchId ? String(selectedBatchId) : "";
  if (explicitBatchId) {
    const explicitBatch = batchById.get(explicitBatchId);
    if (explicitBatch) {
      return { batchId: explicitBatchId, batch: explicitBatch };
    }
  }

  const courseBatches = batchesByCourseId.get(courseId) ?? [];
  if (courseBatches.length === 1) {
    const batch = courseBatches[0];
    return { batchId: String(batch._id), batch };
  }
  if (courseBatches.length > 1) {
    const batch = courseBatches[0];
    return { batchId: String(batch._id), batch };
  }

  return { batchId: explicitBatchId || courseId, batch: undefined };
}

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

    const enrollmentFilter: Record<string, unknown> = {
      student: userId,
      status: { $in: ACTIVE_STATUSES },
      paymentStatus: "paid",
    };

    const [enrollments, batchEnrollments] = await Promise.all([
      Enrollment.find(enrollmentFilter)
        .populate({
          path: "course",
          select:
            "title shortDescription description thumbnailUrl category isPaid price status courseType subjectName",
        })
        .sort({ enrolledAt: -1 })
        .lean(),
      BatchEnrollment.find({
        studentId: userId,
        status: "active",
        paymentStatus: "paid",
        accessBlocked: { $ne: true },
      })
        .populate("batchId")
        .sort({ enrolledAt: -1 })
        .lean(),
    ]);

    const liveCourseIds = enrollments
      .filter((row) => {
        const course = row.course;
        return isPopulatedCourse(course) && normalizeCourseType(course.courseType) === "live";
      })
      .map((row) => {
        const course = row.course;
        if (!isPopulatedCourse(course)) return String(row.course || "");
        return String(course._id ?? row.course);
      })
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const selectedBatchIds = enrollments
      .map((row) => row.selectedBatchId)
      .filter((id): id is any => Boolean(id) && mongoose.Types.ObjectId.isValid(String(id)));

    const [selectedBatches, courseBatches] = await Promise.all([
      selectedBatchIds.length > 0
        ? Batch.find({ _id: { $in: selectedBatchIds } })
            .select(
              "name courseId grade shortDescription thumbnailUrl startDate endDate",
            )
            .lean()
        : Promise.resolve([]),
      liveCourseIds.length > 0
        ? Batch.find({ courseId: { $in: liveCourseIds } })
            .select(
              "name courseId grade shortDescription thumbnailUrl startDate endDate",
            )
            .lean()
        : Promise.resolve([]),
    ]);

    const batchById = new Map<string, LeanBatch>();
    for (const batch of [...selectedBatches, ...courseBatches]) {
      batchById.set(String(batch._id), batch as LeanBatch);
    }

    const batchesByCourseId = new Map<string, LeanBatch[]>();
    for (const batch of courseBatches as LeanBatch[]) {
      const courseId = String(batch.courseId ?? "");
      if (!courseId) continue;
      const rows = batchesByCourseId.get(courseId) ?? [];
      rows.push(batch);
      batchesByCourseId.set(courseId, rows);
    }

    const recordedEnrollments = enrollments
      .filter((row) => {
        const course = row.course;
        if (!isPopulatedCourse(course)) return false;
        return normalizeCourseType(course.courseType) !== "live";
      })
      .map((row) => {
        const course = isPopulatedCourse(row.course) ? row.course : null;
        const courseId = course
          ? String(course._id ?? "")
          : String(row.course || "");
        return {
          _id: String(row._id),
          courseId,
          enrolledAt: (row.enrolledAt as Date).toISOString(),
          status: row.status,
          progress: Number(row.progress || 0),
          paymentStatus: row.paymentStatus,
          courseLuInfo: course
            ? {
                _id: courseId,
                title: String(course.title ?? ""),
                description: String(
                  course.description ?? course.shortDescription ?? "",
                ),
                thumbnailUrl: course.thumbnailUrl
                  ? String(course.thumbnailUrl)
                  : undefined,
                category: course.category
                  ? String(course.category)
                  : undefined,
                isPaid: Boolean(course.isPaid),
                courseType: normalizeCourseType(course.courseType),
              }
            : undefined,
        };
      });

    const validRecordedCourseIds = recordedEnrollments
      .map((e) => e.courseId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const progressRows =
      validRecordedCourseIds.length > 0
        ? await CourseProgress.find({
            student: userId,
            course: { $in: validRecordedCourseIds },
          })
            .select("course progressPercentage")
            .lean()
        : [];

    const progressMap = new Map(
      progressRows.map((p) => [
        String(p.course),
        Number(p.progressPercentage || 0),
      ]),
    );

    const recorded = recordedEnrollments.map((row) => ({
      ...row,
      progress: progressMap.get(row.courseId) ?? row.progress,
    }));

    const liveGroups = new Map<
      string,
      {
        courseId: string;
        courseTitle: string;
        subject?: string;
        thumbnailUrl?: string;
        shortDescription?: string;
        batches: {
          enrollmentId: string;
          batchId: string;
          batchName: string;
          grade: string;
          enrolledAt: string;
          startDate?: string;
          endDate?: string;
        }[];
      }
    >();

    for (const enrollment of enrollments) {
      const course = enrollment.course;
      if (!isPopulatedCourse(course)) continue;
      if (normalizeCourseType(course.courseType) !== "live") continue;

      const courseId = String(course._id ?? enrollment.course);
      const { batchId, batch } = resolveBatchForLiveEnrollment(
        courseId,
        enrollment.selectedBatchId,
        batchById,
        batchesByCourseId,
      );

      if (!liveGroups.has(courseId)) {
        liveGroups.set(courseId, {
          courseId,
          courseTitle: String(course.title ?? batch?.name ?? "Live course"),
          subject: course.subjectName
            ? String(course.subjectName)
            : course.category
              ? String(course.category)
              : undefined,
          thumbnailUrl: course.thumbnailUrl
            ? String(course.thumbnailUrl)
            : batch?.thumbnailUrl
              ? String(batch.thumbnailUrl)
              : undefined,
          shortDescription: course.shortDescription
            ? String(course.shortDescription)
            : batch?.shortDescription
              ? String(batch.shortDescription)
              : undefined,
          batches: [],
        });
      }

      liveGroups.get(courseId)!.batches.push({
        enrollmentId: String(enrollment._id),
        batchId,
        batchName: batch ? String(batch.name ?? "Section") : "Live course",
        grade: String(batch?.grade ?? "O"),
        enrolledAt: (enrollment.enrolledAt as Date).toISOString(),
        startDate: (batch?.startDate as Date | undefined)?.toISOString?.(),
        endDate: (batch?.endDate as Date | undefined)?.toISOString?.(),
      });
    }

    // Merge standalone BatchEnrollments
    for (const bErr of batchEnrollments) {
      const batchDoc = bErr.batchId as unknown as Record<string, unknown> | null;
      if (!batchDoc || typeof batchDoc !== "object" || !("_id" in batchDoc)) continue;
      const batchId = String(batchDoc._id);
      const rawCourseId = String(batchDoc.courseId ?? "");
      const courseId = mongoose.Types.ObjectId.isValid(rawCourseId) ? rawCourseId : batchId;

      const alreadyAdded = Array.from(liveGroups.values()).some((g) =>
        g.batches.some((b) => b.batchId === batchId),
      );
      if (alreadyAdded) continue;

      let courseDoc: Record<string, unknown> | null = null;
      if (mongoose.Types.ObjectId.isValid(rawCourseId)) {
        courseDoc = await Course.findById(rawCourseId)
          .select("title shortDescription thumbnailUrl category subjectName courseType")
          .lean();
      }

      if (!liveGroups.has(courseId)) {
        liveGroups.set(courseId, {
          courseId,
          courseTitle: String(courseDoc?.title ?? batchDoc.name ?? "Live Batch"),
          subject: courseDoc?.subjectName
            ? String(courseDoc.subjectName)
            : courseDoc?.category
              ? String(courseDoc.category)
              : undefined,
          thumbnailUrl: courseDoc?.thumbnailUrl
            ? String(courseDoc.thumbnailUrl)
            : batchDoc.thumbnailUrl
              ? String(batchDoc.thumbnailUrl)
              : undefined,
          shortDescription: courseDoc?.shortDescription
            ? String(courseDoc.shortDescription)
            : (batchDoc.shortDescription as string | undefined),
          batches: [],
        });
      }

      liveGroups.get(courseId)!.batches.push({
        enrollmentId: String(bErr._id),
        batchId,
        batchName: String(batchDoc.name ?? "Live batch"),
        grade: String(batchDoc.grade ?? "O"),
        enrolledAt: (bErr.enrolledAt as Date).toISOString(),
        startDate: (batchDoc.startDate as Date | undefined)?.toISOString?.(),
        endDate: (batchDoc.endDate as Date | undefined)?.toISOString?.(),
      });
    }

    const live = Array.from(liveGroups.values());
    const liveBatchCount = live.reduce((sum, group) => sum + group.batches.length, 0);
    const recordedCount = recorded.length;
    const completedCount =
      recorded.filter((r) => r.status === "completed").length;
    const allProgress = recorded.map((r) => r.progress);
    const averageProgress =
      allProgress.length > 0
        ? Math.round(
            allProgress.reduce((sum, value) => sum + value, 0) /
              allProgress.length,
          )
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          recordedCount,
          liveBatchCount,
          liveCourseCount: live.length,
          completedCount,
          averageProgress,
          hasLive: live.length > 0,
        },
        recorded,
        live,
      },
    });
  } catch (error) {
    console.error("GET /api/student/my-courses", error);
    return NextResponse.json(
      { success: false, error: "Failed to load courses" },
      { status: 500 },
    );
  }
}

