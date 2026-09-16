import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import { isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteCtx) {
  try {
    const auth = await requireSessionUser(["super_admin"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid student id" }, { status: 400 });
    }

    const body = (await request.json()) as { block?: boolean };
    const block = Boolean(body.block);

    const student = await User.findOne({ _id: toObjectId(id), role: "student" });
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    student.isBlockedFromReviews = block;
    await student.save();

    return NextResponse.json({
      success: true,
      message: block
        ? "Student is now blocked from submitting course reviews"
        : "Student can submit course reviews again",
    });
  } catch (error) {
    console.error("PUT block-reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update review block status" },
      { status: 500 },
    );
  }
}
