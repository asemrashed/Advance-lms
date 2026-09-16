import { NextRequest, NextResponse } from "next/server";
import {
  buildCurriculumSuggestions,
} from "@/app/api/_lib/unifiedCourse";
import { requireBatchManageAccess } from "@/app/api/_lib/batchAccess";
import { requireSessionUser } from "@/app/api/_lib/phase12";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const access = await requireBatchManageAccess(id, auth.user);
    if (access.error) return access.error;

    const sourceBatchId = new URL(request.url).searchParams
      .get("sourceBatchId")
      ?.trim();
    if (!sourceBatchId) {
      return NextResponse.json(
        { success: false, error: "sourceBatchId query param is required" },
        { status: 400 },
      );
    }

    try {
      const suggestions = await buildCurriculumSuggestions(
        sourceBatchId,
        id,
      );
      return NextResponse.json({ success: true, data: suggestions });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "curriculum_suggestions_failed";
      const status =
        message === "batch_not_found" || message === "batch_course_mismatch"
          ? 400
          : 500;
      return NextResponse.json(
        {
          success: false,
          error:
            message === "batch_course_mismatch"
              ? "Source batch must belong to the same course"
              : "Failed to load curriculum suggestions",
        },
        { status },
      );
    }
  } catch (error) {
    console.error("GET /api/batches/[id]/curriculum-suggestions", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch curriculum suggestions" },
      { status: 500 },
    );
  }
}
