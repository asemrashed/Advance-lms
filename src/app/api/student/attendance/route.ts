import { NextRequest, NextResponse } from "next/server";
import "@/lib/registerMongooseModels";
import Attendance from "@/models/Attendance";
import Batch from "@/models/Batch";
import LiveClass from "@/models/LiveClass";
import { parseLimit, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

type CountRow = {
  _id: { batchId: unknown; status: unknown };
  count: number;
};

type PopulatedCourse = { _id?: unknown; title?: unknown };

function courseRef(value: unknown): PopulatedCourse {
  return value && typeof value === "object"
    ? (value as PopulatedCourse)
    : {};
}

/** GET /api/student/attendance — only attendance belonging to the signed-in student. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;

    const studentId = toObjectId(auth.user.id);
    const limit = parseLimit(new URL(request.url).searchParams, 100, 500);
    const ownAttendanceMatch = { studentId };

    const [historyRows, countRows] = await Promise.all([
      Attendance.find(ownAttendanceMatch)
        .select("_id liveClassId batchId status markedAt")
        .sort({ markedAt: -1 })
        .limit(limit)
        .lean(),
      Attendance.aggregate<CountRow>([
        { $match: ownAttendanceMatch },
        {
          $group: {
            _id: { batchId: "$batchId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const batchIds = [
      ...new Set(
        [...historyRows.map((row) => String(row.batchId)), ...countRows.map((row) => String(row._id.batchId))],
      ),
    ];
    const liveClassIds = historyRows.map((row) => row.liveClassId);

    const [batches, liveClasses] = await Promise.all([
      batchIds.length
        ? Batch.find({ _id: { $in: batchIds } })
            .select("_id name courseId")
            .populate("courseId", "title")
            .lean()
        : [],
      liveClassIds.length
        ? LiveClass.find({ _id: { $in: liveClassIds } })
            .select("_id title scheduledAt durationMinutes")
            .lean()
        : [],
    ]);

    const batchMap = new Map(
      batches.map((batch) => [String(batch._id), batch] as const),
    );
    const liveClassMap = new Map(
      liveClasses.map((liveClass) => [String(liveClass._id), liveClass] as const),
    );
    const courseKeyForBatch = (batchId: unknown) => {
      const batch = batchMap.get(String(batchId));
      const course = courseRef(batch?.courseId);
      return course._id ? String(course._id) : `batch:${String(batchId)}`;
    };
    const courseTitleForBatch = (batchId: unknown) => {
      const batch = batchMap.get(String(batchId));
      return String(courseRef(batch?.courseId).title ?? batch?.name ?? "Course");
    };

    const overallStatuses: Record<string, number> = {};
    const courseMap = new Map<
      string,
      {
        courseId: string;
        courseTitle: string;
        statuses: Record<string, number>;
        total: number;
        present: number;
        percentage: number;
      }
    >();

    for (const row of countRows) {
      const status = String(row._id.status || "unknown").toLowerCase();
      const count = Number(row.count) || 0;
      overallStatuses[status] = (overallStatuses[status] || 0) + count;

      const key = courseKeyForBatch(row._id.batchId);
      const course =
        courseMap.get(key) ||
        {
          courseId: key,
          courseTitle: courseTitleForBatch(row._id.batchId),
          statuses: {},
          total: 0,
          present: 0,
          percentage: 0,
        };
      course.statuses[status] = (course.statuses[status] || 0) + count;
      course.total += count;
      if (status === "present") course.present += count;
      courseMap.set(key, course);
    }

    const courses = [...courseMap.values()]
      .map((course) => ({
        ...course,
        percentage: course.total
          ? Math.round((course.present / course.total) * 100)
          : 0,
      }))
      .sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));

    const total = Object.values(overallStatuses).reduce(
      (sum, count) => sum + count,
      0,
    );
    const present = overallStatuses.present || 0;
    const history = historyRows.map((row) => {
      const liveClass = liveClassMap.get(String(row.liveClassId));
      const batch = batchMap.get(String(row.batchId));
      return {
        _id: String(row._id),
        liveClassId: String(row.liveClassId),
        batchId: String(row.batchId),
        batchName: String(batch?.name ?? "Batch"),
        courseId: courseKeyForBatch(row.batchId),
        courseTitle: courseTitleForBatch(row.batchId),
        classTitle: String(liveClass?.title ?? "Class"),
        scheduledAt: liveClass?.scheduledAt
          ? new Date(liveClass.scheduledAt).toISOString()
          : new Date(row.markedAt).toISOString(),
        durationMinutes: Number(liveClass?.durationMinutes || 0),
        status: String(row.status || "unknown").toLowerCase(),
        markedAt: new Date(row.markedAt).toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total,
          present,
          absent: overallStatuses.absent || 0,
          percentage: total ? Math.round((present / total) * 100) : 0,
          statuses: overallStatuses,
        },
        courses,
        history,
      },
    });
  } catch (error) {
    console.error("GET /api/student/attendance", error);
    return NextResponse.json(
      { success: false, error: "Failed to load attendance" },
      { status: 500 },
    );
  }
}
