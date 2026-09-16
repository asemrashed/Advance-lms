import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RoutineSlot from "@/models/RoutineSlot";
import { requireBatchManageAccess } from "@/app/api/_lib/batchAccess";
import { generateSessionPreviews } from "@/app/api/_lib/routineGeneration";
import { ensureRoutineSlotsMigrated } from "@/app/api/_lib/legacyRoutineMigrate";
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

    if (endDate < startDate) {
      return NextResponse.json(
        { success: false, error: "endDate must be on or after startDate" },
        { status: 400 },
      );
    }

    await ensureRoutineSlotsMigrated(batchId);
    const slots = await RoutineSlot.find({ batchId: toObjectId(batchId) }).lean();
    const previews = generateSessionPreviews(slots, startDate, endDate);

    const uniqueDays = new Set(previews.map((p) => p.date)).size;

    return NextResponse.json({
      success: true,
      data: {
        previews,
        summary: {
          sessionCount: previews.length,
          dayCount: uniqueDays,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        },
      },
    });
  } catch (error) {
    console.error("POST routine generate-preview", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate preview" },
      { status: 500 },
    );
  }
}
