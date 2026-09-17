import { NextRequest, NextResponse } from "next/server";
import LiveClass from "@/models/LiveClass";
import {
  syncLiveClassToBatchRoutine,
  type ClassRecurrence,
} from "@/app/api/_lib/batchRoutineSync";
import { requireBatchManageAccess, requireBatchViewAccess } from "@/app/api/_lib/batchAccess";
import { notifyLiveClassScheduled } from "@/app/api/_lib/scheduleNotifications";
import { isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";
import Batch from "@/models/Batch";
import { resolveMeetLink } from "@/lib/meetLink";

function parseRecurrence(value: unknown): ClassRecurrence {
  if (value === "weekly" || value === "monthly") return value;
  return "once";
}

type RouteContext = { params: Promise<{ id: string }> };

function mapLiveClass(row: Record<string, unknown>, includeLinks: boolean) {
  const base = {
    _id: String(row._id),
    batchId: String(row.batchId),
    chapterId: row.chapterId ? String(row.chapterId) : undefined,
    title: row.title,
    scheduledAt: (row.scheduledAt as Date)?.toISOString?.() ?? row.scheduledAt,
    durationMinutes: row.durationMinutes,
    recurrence: row.recurrence || "once",
    type: row.type,
    isActive: Boolean(row.isActive),
    createdAt: (row.createdAt as Date)?.toISOString?.() ?? row.createdAt,
    updatedAt: (row.updatedAt as Date)?.toISOString?.() ?? row.updatedAt,
  };

  if (!includeLinks) {
    return {
      ...base,
      hasMeetLink: Boolean(row.meetLink),
      hasRecording: Boolean(row.recordingUrl),
    };
  }

  return {
    ...base,
    meetLink: row.meetLink || undefined,
    recordingUrl: row.recordingUrl || undefined,
    joinUrl:
      row.type === "recorded" && row.recordingUrl
        ? row.recordingUrl
        : row.meetLink || undefined,
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const { id: batchId } = await context.params;
    const access = await requireBatchViewAccess(batchId, auth.user);
    if (access.error) return access.error;

    const filter: Record<string, unknown> = { batchId: toObjectId(batchId) };
    if (auth.user.role === "student") {
      filter.isActive = true;
    }

    const rows = await LiveClass.find(filter).sort({ scheduledAt: 1 }).lean();
    const includeLinks = true;

    return NextResponse.json({
      success: true,
      data: {
        liveClasses: rows.map((r) =>
          mapLiveClass(r as Record<string, unknown>, includeLinks),
        ),
        canManage: access.canManage,
      },
    });
  } catch (error) {
    console.error("GET live-classes", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch live classes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id: batchId } = await context.params;
    const access = await requireBatchManageAccess(batchId, auth.user);
    if (access.error) return access.error;

    const body = (await request.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 },
      );
    }

    const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "Valid scheduledAt is required" },
        { status: 400 },
      );
    }

    const durationMinutes = Number(body.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      return NextResponse.json(
        { success: false, error: "durationMinutes must be at least 1" },
        { status: 400 },
      );
    }

    const type = body.type === "recorded" ? "recorded" : "live";
    const recurrence = parseRecurrence(body.recurrence);
    const batch = await Batch.findById(batchId).select("meetLink").lean();
    const meetLink = resolveMeetLink(
      typeof body.meetLink === "string" ? body.meetLink : undefined,
      batch?.meetLink ? String(batch.meetLink) : undefined,
    );

    const liveClass = await LiveClass.create({
      batchId: toObjectId(batchId),
      chapterId:
        typeof body.chapterId === "string" && isObjectId(body.chapterId)
          ? toObjectId(body.chapterId)
          : undefined,
      title,
      scheduledAt,
      durationMinutes,
      recurrence,
      meetLink,
      recordingUrl:
        typeof body.recordingUrl === "string" ? body.recordingUrl.trim() : undefined,
      type,
      isActive: body.isActive !== false,
      instructorId: auth.user.id ? toObjectId(auth.user.id) : undefined,
    });

    await syncLiveClassToBatchRoutine(batchId, liveClass, recurrence);
    await notifyLiveClassScheduled(batchId, {
      _id: liveClass._id,
      title: liveClass.title,
      scheduledAt: liveClass.scheduledAt,
      instructorId: liveClass.instructorId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          liveClass: mapLiveClass(
            liveClass.toObject() as Record<string, unknown>,
            true,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST live-classes", error);
    return NextResponse.json(
      { success: false, error: "Failed to create live class" },
      { status: 500 },
    );
  }
}
