import "@/lib/registerMongooseModels";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";
import LiveClass from "@/models/LiveClass";
import {
  listRoutineSlotsForBatch,
} from "@/app/api/_lib/batchAccess";
import { deriveUpcomingFromLiveClassRows } from "@/app/api/_lib/upcomingLiveClasses";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import type {
  StudentDashboardBatchSummary,
  StudentDashboardRoutineDay,
  StudentDashboardUpcomingClass,
} from "@/types/studentDashboard";

function isPopulatedCourse(
  value: unknown,
): value is Record<string, unknown> & { _id?: unknown; courseType?: unknown } {
  return Boolean(value && typeof value === "object" && "_id" in (value as object));
}

export async function loadStudentBatchDashboardData(studentId: string): Promise<{
  batches: StudentDashboardBatchSummary[];
  upcomingClasses: StudentDashboardUpcomingClass[];
  weeklyRoutine: StudentDashboardRoutineDay[];
}> {
  const enrollments = await Enrollment.find({
    student: studentId,
    status: { $in: ["enrolled", "in_progress", "completed"] },
    paymentStatus: "paid",
  })
    .populate({ path: "course", select: "courseType title" })
    .select("selectedBatchId course")
    .lean();

  const batchIds = new Set<string>();
  const liveCourseIds = new Set<string>();

  for (const enrollment of enrollments) {
    if (enrollment.selectedBatchId) {
      batchIds.add(String(enrollment.selectedBatchId));
    }

    const course = enrollment.course;
    if (!isPopulatedCourse(course)) continue;
    if (normalizeCourseType(course.courseType) !== "live") continue;
    liveCourseIds.add(String(course._id ?? enrollment.course));
  }

  if (liveCourseIds.size > 0) {
    const courseBatches = await Batch.find({
      courseId: { $in: Array.from(liveCourseIds) },
    })
      .select("_id")
      .lean();
    for (const batch of courseBatches) {
      batchIds.add(String(batch._id));
    }
  }

  if (batchIds.size === 0) {
    return { batches: [], upcomingClasses: [], weeklyRoutine: [] };
  }

  const batchIdList = Array.from(batchIds);

  const [batchRows, liveClassRows, countMap] = await Promise.all([
    Batch.find({ _id: { $in: batchIdList } })
      .select("name grade shortDescription thumbnailUrl maxStudents courseId")
      .lean(),
    LiveClass.find({
      batchId: { $in: batchIdList },
      isActive: true,
    })
      .sort({ scheduledAt: 1 })
      .lean(),
    Enrollment.aggregate([
      {
        $match: {
          selectedBatchId: { $in: batchIdList },
          status: { $in: ["enrolled", "in_progress", "completed"] },
          paymentStatus: "paid",
        },
      },
      { $group: { _id: "$selectedBatchId", count: { $sum: 1 } } },
    ]),
  ]);

  const nameById = new Map(
    batchRows.map((b) => [String(b._id), String(b.name ?? "Batch")]),
  );

  const batches: StudentDashboardBatchSummary[] = batchRows.map((b) => ({
    _id: String(b._id),
    name: String(b.name ?? ""),
    grade: String(b.grade ?? "O"),
    shortDescription: String(b.shortDescription ?? ""),
    thumbnailUrl: String(b.thumbnailUrl ?? ""),
    fee: 0,
    maxStudents: Number(b.maxStudents) || 0,
    enrolledCount:
      countMap.find((row) => String(row._id) === String(b._id))?.count ?? 0,
  }));

  const upcomingClasses: StudentDashboardUpcomingClass[] =
    deriveUpcomingFromLiveClassRows(
      liveClassRows as Parameters<typeof deriveUpcomingFromLiveClassRows>[0],
      nameById,
      { horizonDays: 14, limit: 8 },
    );

  const routineByBatch: StudentDashboardRoutineDay[] = [];
  for (const batch of batchRows) {
    const batchId = String(batch._id);
    const slots = await listRoutineSlotsForBatch(batchId);
    const byDay = new Map<number, { label: string; slots: typeof slots }>();
    const labels = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    for (let d = 0; d <= 6; d++) {
      byDay.set(d, { label: labels[d], slots: [] });
    }
    for (const slot of slots.filter((s) => s.status === "active")) {
      const day = byDay.get(slot.dayOfWeek);
      if (day) {
        day.slots.push(slot);
      }
    }
    routineByBatch.push({
      batchId,
      batchName: String(batch.name ?? ""),
      days: Array.from(byDay.entries()).map(([dayOfWeek, day]) => ({
        dayOfWeek,
        label: day.label,
        slots: day.slots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: slot.topic,
        })),
      })),
    });
  }

  routineByBatch.sort((a, b) => a.batchName.localeCompare(b.batchName));

  return { batches, upcomingClasses, weeklyRoutine: routineByBatch };
}
