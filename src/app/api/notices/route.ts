import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notice from "@/models/Notice";
import {
  applyNoticeStaffListScope,
  applyNoticeStudentListScope,
  mapNotice,
  pagination,
  parseNoticeCategory,
  validateNoticeCreateBody,
} from "@/app/api/_lib/notices";
import {
  parseLimit,
  parsePage,
  requireSessionUser,
  escapeRegex,
} from "@/app/api/_lib/phase12";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 20, 50);
    const skip = (page - 1) * limit;
    const search = searchParams.get("search")?.trim();
    const category = parseNoticeCategory(searchParams.get("category"));
    const subject = searchParams.get("subject")?.trim();
    const batchId = searchParams.get("batchId")?.trim();
    const courseId = searchParams.get("courseId")?.trim();
    const instructorId = searchParams.get("instructorId")?.trim();
    const isActive = searchParams.get("isActive");
    const pinnedOnly = searchParams.get("pinned") === "true";

    const query: Record<string, unknown> = {};

    if (search) {
      const existing = Array.isArray(query.$and)
        ? (query.$and as Record<string, unknown>[])
        : [];
      query.$and = [
        ...existing,
        {
          $or: [
            { title: { $regex: escapeRegex(search), $options: "i" } },
            { body: { $regex: escapeRegex(search), $options: "i" } },
            { subject: { $regex: escapeRegex(search), $options: "i" } },
          ],
        },
      ];
    }
    if (category) query.category = category;
    if (subject) query.subject = { $regex: escapeRegex(subject), $options: "i" };
    if (batchId) query.batchId = batchId;
    if (courseId) query.courseId = courseId;
    if (instructorId) query.instructorId = instructorId;

    if (auth.user.role === "student") {
      query.isActive = true;
      await applyNoticeStudentListScope(query, auth.user.id);
    } else {
      if (isActive != null) query.isActive = isActive === "true";
      await applyNoticeStaffListScope(query, auth.user);
    }

    if (pinnedOnly) query.isPinned = true;

    const sort: Record<string, 1 | -1> = { isPinned: -1, createdAt: -1 };

    const [rows, total] = await Promise.all([
      Notice.find(query)
        .populate("postedBy", "name email role")
        .populate("instructorId", "name email")
        .populate("courseId", "title")
        .populate("batchId", "name subject grade")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Notice.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notices: rows.map((row) => mapNotice(row as Record<string, unknown>)),
        pagination: pagination(page, limit, total),
      },
    });
  } catch (error) {
    console.error("GET /api/notices", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;
    const validated = await validateNoticeCreateBody(body, auth.user);
    if ("error" in validated) {
      return NextResponse.json(
        { success: false, error: validated.error },
        { status: validated.status },
      );
    }

    const notice = await Notice.create(validated.doc);

    const created = await Notice.findById(notice._id)
      .populate("postedBy", "name email role")
      .populate("instructorId", "name email")
      .populate("courseId", "title")
      .populate("batchId", "name subject grade")
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          notice: mapNotice(created as Record<string, unknown>),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/notices", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
