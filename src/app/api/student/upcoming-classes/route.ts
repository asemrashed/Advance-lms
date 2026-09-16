import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Batch from "@/models/Batch";
import { studentEnrolledBatchIds } from "@/app/api/_lib/batchAccess";
import { loadUpcomingLiveClassesForBatches } from "@/app/api/_lib/upcomingLiveClasses";
import { parseLimit, requireSessionUser } from "@/app/api/_lib/phase12";

/** GET /api/student/upcoming-classes — LiveClass-derived widget feed (Phase 19.2). */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams, 8, 20);
    const horizonDays = Math.min(
      30,
      Math.max(1, Number.parseInt(searchParams.get("days") || "14", 10) || 14),
    );

    const batchIds = await studentEnrolledBatchIds(auth.user.id);
    if (batchIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { upcomingClasses: [] },
      });
    }

    const batchRows = await Batch.find({ _id: { $in: batchIds } })
      .select("name")
      .lean();
    const nameById = new Map(
      batchRows.map((b) => [String(b._id), String(b.name ?? "Batch")]),
    );

    const rows = await loadUpcomingLiveClassesForBatches(batchIds, {
      horizonDays,
      limit,
    });

    const upcomingClasses = rows.map((row) => ({
      ...row,
      batchName: nameById.get(row.batchId) ?? row.batchName,
    }));

    return NextResponse.json({
      success: true,
      data: { upcomingClasses },
    });
  } catch (error) {
    console.error("GET /api/student/upcoming-classes", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch upcoming classes" },
      { status: 500 },
    );
  }
}
