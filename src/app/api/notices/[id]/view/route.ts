import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notice from "@/models/Notice";
import { mapNotice, studentCanViewNotice } from "@/app/api/_lib/notices";
import {
  isObjectId,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error || !auth.user) return auth.error;

    await connectDB();
    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid notice ID" },
        { status: 400 },
      );
    }

    const notice = await Notice.findById(id);
    if (!notice || !notice.isActive) {
      return NextResponse.json(
        { success: false, error: "Notice not found" },
        { status: 404 },
      );
    }

    if (auth.user.role === "student") {
      const canView = await studentCanViewNotice(
        notice.toObject() as Record<string, unknown>,
        auth.user.id,
      );
      if (!canView) {
        return NextResponse.json(
          { success: false, error: "Notice not found" },
          { status: 404 },
        );
      }
    }

    const viewerId = toObjectId(auth.user.id);
    const already = (notice.viewedBy || []).some(
      (idVal: { toString(): string } | string) =>
        String(idVal) === auth.user.id,
    );
    if (!already) {
      notice.viewedBy = [...(notice.viewedBy || []), viewerId];
      notice.viewCount = Number(notice.viewCount || 0) + 1;
      await notice.save();
    }

    const populated = await Notice.findById(notice._id)
      .populate("postedBy", "name email role")
      .populate("instructorId", "name email")
      .populate("courseId", "title")
      .populate("batchId", "name subject grade")
      .populate("comments.author", "name email")
      .lean();

    return NextResponse.json({
      success: true,
      data: { notice: mapNotice(populated as Record<string, unknown>) },
    });
  } catch (error) {
    console.error("POST /api/notices/[id]/view", error);
    return NextResponse.json(
      { success: false, error: "Failed to record view" },
      { status: 500 },
    );
  }
}
