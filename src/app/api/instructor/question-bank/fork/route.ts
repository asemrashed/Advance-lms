import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { forkPlatformQuestionForInstructor } from "@/app/api/_lib/platformQuestionAccess";

/**
 * POST /api/instructor/question-bank/fork
 * Body: { platformQuestionId }
 * Copy-on-write: clone a shared Platform QB question into the instructor's bank.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["instructor"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const platformQuestionId = String(body.platformQuestionId || "").trim();
    if (!platformQuestionId) {
      return NextResponse.json(
        { success: false, error: "platformQuestionId is required" },
        { status: 400 },
      );
    }

    const result = await forkPlatformQuestionForInstructor(auth.user.id, platformQuestionId);
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({ success: true, data: result.question }, { status: 201 });
  } catch (error) {
    console.error("Fork platform question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create editable copy" },
      { status: 500 },
    );
  }
}
