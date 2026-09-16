import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { adminGrantAccess } from "@/app/api/_lib/platformQuestionAccess";

/** POST /api/platform-questions/access-requests/grant — admin Give Access. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const result = await adminGrantAccess(auth.user, body);
    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, data: result.doc }, { status: 201 });
  } catch (error) {
    console.error("Admin QB grant error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to grant access" },
      { status: 500 },
    );
  }
}
