import { NextRequest, NextResponse } from "next/server";
import Assignment from "@/models/Assignment";
import Exam from "@/models/Exam";
import LiveClass from "@/models/LiveClass";
import {
  expandLiveClassEvents,
  formatMonthLabel,
  getCalendarRange,
  type BatchCalendarEvent,
} from "@/app/api/_lib/batchCalendar";
import { requireBatchViewAccess } from "@/app/api/_lib/batchAccess";
import { requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const { id: batchId } = await context.params;
    const access = await requireBatchViewAccess(batchId, auth.user);
    if (access.error) return access.error;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get("year")) || now.getFullYear();
    const month = Number(searchParams.get("month")) || now.getMonth() + 1;

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid year or month" },
        { status: 400 },
      );
    }

    const { rangeStart, rangeEnd } = getCalendarRange(year, month);
    const instructorId = access.batch!.instructorId;

    const liveClassFilter: Record<string, unknown> = {
      batchId: toObjectId(batchId),
      isActive: true,
    };

    const liveClasses = await LiveClass.find(liveClassFilter).lean();
    const events: BatchCalendarEvent[] = expandLiveClassEvents(
      liveClasses as Parameters<typeof expandLiveClassEvents>[0],
      rangeStart,
      rangeEnd,
    );

    if (access.batch!.startDate) {
      const start = new Date(access.batch!.startDate);
      if (start >= rangeStart && start <= rangeEnd) {
        events.push({
          id: `batch-start-${batchId}`,
          type: "batch",
          title: "Batch starts",
          start: start.toISOString(),
          allDay: true,
          color: "#059669",
        });
      }
    }

    if (access.batch!.endDate) {
      const end = new Date(access.batch!.endDate);
      if (end >= rangeStart && end <= rangeEnd) {
        events.push({
          id: `batch-end-${batchId}`,
          type: "batch",
          title: "Batch ends",
          start: end.toISOString(),
          allDay: true,
          color: "#dc2626",
        });
      }
    }

    const assignmentFilter = {
      createdBy: instructorId,
      isPublished: true,
      $or: [
        { startDate: { $gte: rangeStart, $lte: rangeEnd } },
        { dueDate: { $gte: rangeStart, $lte: rangeEnd } },
      ],
    };

    const assignments = await Assignment.find(assignmentFilter)
      .select("title startDate dueDate")
      .lean();

    for (const a of assignments) {
      if (a.startDate) {
        const start = new Date(a.startDate);
        if (start >= rangeStart && start <= rangeEnd) {
          events.push({
            id: `asg-start-${a._id}`,
            type: "assignment",
            title: `${a.title} (starts)`,
            start: start.toISOString(),
            color: "#2563eb",
          });
        }
      }
      if (a.dueDate) {
        const due = new Date(a.dueDate);
        if (due >= rangeStart && due <= rangeEnd) {
          events.push({
            id: `asg-due-${a._id}`,
            type: "assignment",
            title: `${a.title} (due)`,
            start: due.toISOString(),
            color: "#1d4ed8",
          });
        }
      }
    }

    const exams = await Exam.find({
      createdBy: instructorId,
      isPublished: true,
      $or: [
        { startDate: { $gte: rangeStart, $lte: rangeEnd } },
        { endDate: { $gte: rangeStart, $lte: rangeEnd } },
      ],
    })
      .select("title startDate endDate")
      .lean();

    for (const exam of exams) {
      if (exam.startDate) {
        const start = new Date(exam.startDate);
        if (start >= rangeStart && start <= rangeEnd) {
          events.push({
            id: `exam-start-${exam._id}`,
            type: "exam",
            title: `${exam.title} (starts)`,
            start: start.toISOString(),
            color: "#ea580c",
          });
        }
      }
      if (exam.endDate) {
        const end = new Date(exam.endDate);
        if (end >= rangeStart && end <= rangeEnd) {
          events.push({
            id: `exam-end-${exam._id}`,
            type: "exam",
            title: `${exam.title} (ends)`,
            start: end.toISOString(),
            color: "#c2410c",
          });
        }
      }
    }

    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        label: formatMonthLabel(year, month),
        events,
      },
    });
  } catch (error) {
    console.error("GET /api/batches/[id]/calendar", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch calendar" },
      { status: 500 },
    );
  }
}
