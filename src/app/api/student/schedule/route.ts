import { NextRequest, NextResponse } from "next/server";
import "@/lib/registerMongooseModels";
import Assignment from "@/models/Assignment";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";
import Exam from "@/models/Exam";
import LiveClass from "@/models/LiveClass";
import RoutineSlot from "@/models/RoutineSlot";
import { studentEnrolledBatchIds } from "@/app/api/_lib/batchAccess";
import { requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";
import { getDisplayName } from "@/lib/displayName";
import { resolveMeetLink } from "@/lib/meetLink";

type PopulatedRef = {
  _id?: unknown;
  title?: unknown;

  name?: unknown;
};

function populatedRef(value: unknown): PopulatedRef {
  return value && typeof value === "object" ? (value as PopulatedRef) : {};
}

function instructorName(value: unknown) {
  const ref = populatedRef(value);
  return getDisplayName(
    { name: ref.name != null ? String(ref.name) : undefined },
    "",
  );
}

function validRange(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = new Date(searchParams.get("from") || "");
  const to = new Date(searchParams.get("to") || "");
  const span = to.getTime() - from.getTime();
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    span < 0 ||
    span > 31 * 24 * 60 * 60 * 1000
  ) {
    return null;
  }
  return { from, to };
}

/** GET /api/student/schedule — routine and dated classes for signed-in student's paid batches. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;

    const range = validRange(request);
    if (!range) {
      return NextResponse.json(
        { success: false, error: "A valid from/to range of up to 31 days is required" },
        { status: 400 },
      );
    }

    const batchIds = await studentEnrolledBatchIds(auth.user.id);
    const directEnrollments = await Enrollment.find({
      student: toObjectId(auth.user.id),
      status: { $in: ["enrolled", "in_progress", "completed"] },
    })
      .select("course")
      .lean();

    const batches = batchIds.length
      ? await Batch.find({ _id: { $in: batchIds } })
          .select("_id name courseId startDate endDate meetLink")
          .populate("courseId", "title")
          .lean()
      : [];

    const courseIds = new Map<string, unknown>();
    for (const enrollment of directEnrollments) {
      if (enrollment.course) courseIds.set(String(enrollment.course), enrollment.course);
    }
    for (const batch of batches) {
      const course = populatedRef(batch.courseId);
      if (course._id) courseIds.set(String(course._id), course._id);
    }

    const assessmentEnd = new Date(range.to);
    assessmentEnd.setDate(assessmentEnd.getDate() + 90);
    const courseObjectIds = [...courseIds.values()];

    const [routineRows, liveRows, examRows, assignmentRows] = await Promise.all([
      batchIds.length
        ? RoutineSlot.find({
            batchId: { $in: batchIds },
            status: "active",
          })
            .populate("instructorId", "name")
            .sort({ dayOfWeek: 1, startTime: 1 })
            .lean()
        : [],
      batchIds.length
        ? LiveClass.find({
            batchId: { $in: batchIds },
            scheduledAt: { $gte: range.from, $lte: range.to },
            isActive: true,
          })
            .populate("instructorId", "name")
            .sort({ scheduledAt: 1 })
            .lean()
        : [],
      courseObjectIds.length
        ? Exam.find({
            course: { $in: courseObjectIds },
            isActive: true,
            isPublished: true,
            startDate: { $gte: range.from, $lte: assessmentEnd },
          })
            .populate("course", "title")
            .sort({ startDate: 1 })
            .limit(10)
            .lean()
        : [],
      courseObjectIds.length
        ? Assignment.find({
            course: { $in: courseObjectIds },
            isActive: true,
            isPublished: true,
            dueDate: { $gte: range.from, $lte: assessmentEnd },
          })
            .populate("course", "title")
            .sort({ dueDate: 1 })
            .limit(10)
            .lean()
        : [],
    ]);

    const batchMap = new Map(
      batches.map((batch) => [String(batch._id), batch] as const),
    );
    const batchInfo = (batchId: unknown) => {
      const batch = batchMap.get(String(batchId));
      const course = populatedRef(batch?.courseId);
      return {
        batchName: String(batch?.name ?? "Batch"),
        courseId: course._id ? String(course._id) : "",
        courseTitle: String(course.title ?? batch?.name ?? "Course"),
      };
    };

    const routine = routineRows.map((slot) => ({
      _id: String(slot._id),
      batchId: String(slot.batchId),
      ...batchInfo(slot.batchId),
      dayOfWeek: Number(slot.dayOfWeek),
      startTime: String(slot.startTime),
      endTime: String(slot.endTime),
      title: String(slot.topic || "Class"),
      instructorName: instructorName(slot.instructorId),
      batchStartDate: batchMap.get(String(slot.batchId))?.startDate?.toISOString(),
      batchEndDate: batchMap.get(String(slot.batchId))?.endDate?.toISOString(),
    }));

    const liveClasses = liveRows.map((liveClass) => ({
      _id: String(liveClass._id),
      batchId: String(liveClass.batchId),
      ...batchInfo(liveClass.batchId),
      routineSlotId: liveClass.routineSlotId
        ? String(liveClass.routineSlotId)
        : undefined,
      title: String(liveClass.title || "Live class"),
      scheduledAt: new Date(liveClass.scheduledAt).toISOString(),
      durationMinutes: Number(liveClass.durationMinutes || 60),
      instructorName: instructorName(liveClass.instructorId),
      type: liveClass.type === "recorded" ? "recorded" : "live",
      joinUrl: resolveMeetLink(
        liveClass.meetLink,
        batchMap.get(String(liveClass.batchId))?.meetLink,
      ),
    }));

    const assessments = [
      ...examRows.map((exam) => ({
        _id: String(exam._id),
        kind: "exam" as const,
        title: String(exam.title),
        courseTitle: String(populatedRef(exam.course).title ?? ""),
        scheduledAt: new Date(exam.startDate as Date).toISOString(),
        durationMinutes: Number(exam.duration || 0),
        totalMarks: Number(exam.totalMarks || 0),
        href: `/student/exams/${String(exam._id)}/take`,
      })),
      ...assignmentRows.map((assignment) => ({
        _id: String(assignment._id),
        kind: "assignment" as const,
        title: String(assignment.title),
        courseTitle: String(populatedRef(assignment.course).title ?? ""),
        scheduledAt: new Date(assignment.dueDate as Date).toISOString(),
        totalMarks: Number(assignment.totalMarks || 0),
        href: `/student/assignments/${String(assignment._id)}`,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        routine,
        liveClasses,
        assessments,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/student/schedule", error);
    return NextResponse.json(
      { success: false, error: "Failed to load schedule" },
      { status: 500 },
    );
  }
}
