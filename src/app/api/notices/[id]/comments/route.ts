import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notice from "@/models/Notice";
import {
  assertNoticeWriteAccess,
  mapNotice,
  studentCanViewNotice,
} from "@/app/api/_lib/notices";
import {
  isObjectId,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    } else if (auth.user.role === "instructor") {
      const access = await assertNoticeWriteAccess(
        notice.toObject() as Record<string, unknown>,
        auth.user,
      );
      // Instructors may comment on notices they can write, or any active notice they posted.
      if (access.error && String(notice.postedBy) !== auth.user.id) {
        return NextResponse.json(
          { success: false, error: access.error },
          { status: access.status ?? 403 },
        );
      }
    }

    const body = (await request.json()) as { body?: string };
    const text = String(body.body || "").trim();
    if (!text) {
      return NextResponse.json(
        { success: false, error: "Comment body is required" },
        { status: 400 },
      );
    }
    if (text.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Comment cannot exceed 2000 characters" },
        { status: 400 },
      );
    }

    notice.comments = [
      ...(notice.comments || []),
      {
        author: toObjectId(auth.user.id),
        body: text,
        createdAt: new Date(),
      },
    ];
    await notice.save();

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
    console.error("POST /api/notices/[id]/comments", error);
    return NextResponse.json(
      { success: false, error: "Failed to add comment" },
      { status: 500 },
    );
  }
}
