import { NextRequest, NextResponse } from "next/server";
import LiveClass from "@/models/LiveClass";
import Batch from "@/models/Batch";
import {
  countActivePaidEnrollmentsByBatchIds,
  instructorAccessibleBatchFilter,
} from "@/app/api/_lib/batchAccess";
import { requireSessionUser } from "@/app/api/_lib/phase12";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["instructor"]);
    if (auth.error || !auth.user) return auth.error;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const from = fromParam ? new Date(fromParam) : startOfDay(now);
    const toDefault = new Date(from);
    toDefault.setDate(toDefault.getDate() + 6);
    const to = toParam ? new Date(toParam) : endOfDay(toDefault);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid from/to date" },
        { status: 400 },
      );
    }

    const batchFilter = await instructorAccessibleBatchFilter(auth.user.id);
    const batches = await Batch.find(batchFilter)
      .select("_id name courseId maxStudents")
      .populate({ path: "courseId", select: "title" })
      .lean();
    const batchIds = batches.map((b) => b._id);
    const enrolledCounts = await countActivePaidEnrollmentsByBatchIds(batchIds);
    const batchMap = new Map(
      batches.map((b) => [String(b._id), b] as const),
    );

    if (batchIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { classes: [], from: from.toISOString(), to: to.toISOString() },
      });
    }

    const classes = await LiveClass.find({
      batchId: { $in: batchIds },
      scheduledAt: { $gte: from, $lte: to },
    })
      .sort({ scheduledAt: 1 })
      .lean();

    const rows = classes.map((c) => {
      const batch = batchMap.get(String(c.batchId));
      const course = batch?.courseId as
        | { _id?: unknown; title?: string }
        | undefined;
      return {
        _id: String(c._id),
        batchId: String(c.batchId),
        batchName: String(batch?.name || "Batch"),
        courseId: course?._id ? String(course._id) : "",
        courseTitle: String(course?.title || ""),
        title: String(c.title || "Live class"),
        scheduledAt: c.scheduledAt
          ? new Date(c.scheduledAt).toISOString()
          : "",
        durationMinutes: Number(c.durationMinutes || 60),
        type: c.type === "recorded" ? "recorded" : "live",
        enrolledCount: enrolledCounts.get(String(c.batchId)) ?? 0,
        maxStudents: Number(batch?.maxStudents || 0),
        meetLink: c.meetLink || "",
        recordingUrl: c.recordingUrl || "",
        status: c.isActive === false ? "cancelled" : "scheduled",
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        classes: rows,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/instructor/schedule", error);
    return NextResponse.json(
      { success: false, error: "Failed to load schedule" },
      { status: 500 },
    );
  }
}
