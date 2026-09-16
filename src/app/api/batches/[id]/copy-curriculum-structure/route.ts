import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";

type RouteContext = { params: Promise<{ id: string }> };

/** Disabled in Phase 1 — chapters come from the subject, not batch copy. */
export async function POST(_request: NextRequest, _context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    return NextResponse.json(
      {
        success: false,
        error:
          "Chapters come from the subject catalog. Add them in Curriculum Builder. Copying curriculum structure is disabled.",
      },
      { status: 403 },
    );
  } catch (error) {
    console.error("POST /api/batches/[id]/copy-curriculum-structure", error);
    return NextResponse.json(
      { success: false, error: "Failed to copy curriculum structure" },
      { status: 500 },
    );
  }
}
