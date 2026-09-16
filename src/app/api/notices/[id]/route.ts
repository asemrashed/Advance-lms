import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notice from "@/models/Notice";
import {
  assertNoticeWriteAccess,
  getNoticeById,
  mapNotice,
  pickNoticeUpdate,
  studentCanViewNotice,
} from "@/app/api/_lib/notices";
import { isObjectId, requireSessionUser } from "@/app/api/_lib/phase12";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function invalidIdResponse() {
  return NextResponse.json(
    { success: false, error: "Invalid notice ID" },
    { status: 400 },
  );
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    if (!isObjectId(id)) return invalidIdResponse();

    const notice = await getNoticeById(id);
    if (!notice) {
      return NextResponse.json(
        { success: false, error: "Notice not found" },
        { status: 404 },
      );
    }

    if (auth.user.role === "student") {
      if (!notice.isActive) {
        return NextResponse.json(
          { success: false, error: "Notice not found" },
          { status: 404 },
        );
      }
      const canView = await studentCanViewNotice(
        notice as Record<string, unknown>,
        auth.user.id,
      );
      if (!canView) {
        return NextResponse.json(
          { success: false, error: "Notice not found" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        notice: mapNotice(notice as Record<string, unknown>),
      },
    });
  } catch (error) {
    console.error("GET /api/notices/[id]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    if (!isObjectId(id)) return invalidIdResponse();

    const existing = await Notice.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Notice not found" },
        { status: 404 },
      );
    }

    const access = await assertNoticeWriteAccess(existing, auth.user);
    if (access.error) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const update = pickNoticeUpdate(body);
    // Instructors may pin/unpin notices they own; admins may pin any.
    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await Notice.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .populate("postedBy", "name email role")
      .populate("instructorId", "name email")
      .populate("courseId", "title")
      .populate("batchId", "name subject grade")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        notice: mapNotice(updated as Record<string, unknown>),
      },
    });
  } catch (error) {
    console.error("PATCH /api/notices/[id]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    if (!isObjectId(id)) return invalidIdResponse();

    const existing = await Notice.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Notice not found" },
        { status: 404 },
      );
    }

    const access = await assertNoticeWriteAccess(existing, auth.user);
    if (access.error) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 },
      );
    }

    await Notice.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notices/[id]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
