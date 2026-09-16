import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import LiveClass from "@/models/LiveClass";
import RoutineSlot from "@/models/RoutineSlot";
import { requireBatchManageAccess } from "@/app/api/_lib/batchAccess";
import {
  generateSessionPreviews,
  previewToScheduledAt,
  slotDurationMinutes,
} from "@/app/api/_lib/routineGeneration";
import { ensureRoutineSlotsMigrated } from "@/app/api/_lib/legacyRoutineMigrate";
import { notifyRoutinePublished } from "@/app/api/_lib/scheduleNotifications";
import { requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id: batchId } = await context.params;
    const access = await requireBatchManageAccess(batchId, auth.user);
    if (access.error) return access.error;

    const body = (await request.json()) as Record<string, unknown>;
    const startDate = body.startDate ? new Date(String(body.startDate)) : null;
    const endDate = body.endDate ? new Date(String(body.endDate)) : null;

    if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Valid startDate and endDate are required" },
        { status: 400 },
      );
    }

    await ensureRoutineSlotsMigrated(batchId);
    const slots = await RoutineSlot.find({ batchId: toObjectId(batchId) }).lean();
    const previews = generateSessionPreviews(slots, startDate, endDate);

    const slotMap = new Map(slots.map((s) => [String(s._id), s]));
    const created: { _id: string; title: string; scheduledAt: string }[] = [];

    for (const preview of previews) {
      const slot = slotMap.get(preview.routineSlotId);
      if (!slot) continue;

      const scheduledAt = previewToScheduledAt(preview.date, preview.startTime);
      const durationMinutes = slotDurationMinutes(slot);

      const existing = await LiveClass.findOne({
        batchId: toObjectId(batchId),
        routineSlotId: slot._id,
        scheduledAt,
      }).lean();

      if (existing) continue;

      const live = await LiveClass.create({
        batchId: toObjectId(batchId),
        chapterId: preview.chapterId
          ? toObjectId(preview.chapterId)
          : preview.batchClassId
            ? toObjectId(preview.batchClassId)
            : slot.chapterId ?? slot.batchClassId,
        routineSlotId: slot._id,
        instructorId: toObjectId(preview.instructorId),
        title: preview.topic,
        scheduledAt,
        durationMinutes,
        recurrence: "once",
        type: "live",
        isActive: true,
      });

      created.push({
        _id: String(live._id),
        title: live.title,
        scheduledAt: live.scheduledAt.toISOString(),
      });
    }

    await notifyRoutinePublished(batchId, created.length);

    return NextResponse.json({
      success: true,
      data: {
        publishedCount: created.length,
        skippedCount: previews.length - created.length,
        sessions: created,
      },
    });
  } catch (error) {
    console.error("POST routine publish", error);
    return NextResponse.json(
      { success: false, error: "Failed to publish sessions" },
      { status: 500 },
    );
  }
}
