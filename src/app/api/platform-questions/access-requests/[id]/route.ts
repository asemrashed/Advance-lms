import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { patchAccessRequest } from "@/app/api/_lib/platformQuestionAccess";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await patchAccessRequest(auth.user, id, body);
    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, data: result.doc });
  } catch (error) {
    console.error("Platform access-request PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update access request" },
      { status: 500 },
    );
  }
}
