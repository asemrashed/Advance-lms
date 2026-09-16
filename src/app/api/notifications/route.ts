import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import InAppNotification from "@/models/InAppNotification";
import { mapInAppNotification } from "@/app/api/_lib/scheduleNotifications";
import {
  pagination,
  parseLimit,
  parsePage,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";

/** GET /api/notifications — in-app feed for signed-in user (Phase 19.3). */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 20, 50);
    const skip = (page - 1) * limit;
    const unreadOnly = searchParams.get("unread") === "true";
    const type = searchParams.get("type")?.trim();
    const excludeType = searchParams.get("excludeType")?.trim();

    const query: Record<string, unknown> = {
      userId: toObjectId(auth.user.id),
    };
    if (unreadOnly) query.isRead = false;
    if (type) {
      query.type = type;
    } else if (excludeType) {
      query.type = { $ne: excludeType };
    }

    const unreadQuery: Record<string, unknown> = {
      userId: toObjectId(auth.user.id),
      isRead: false,
    };
    if (type) {
      unreadQuery.type = type;
    } else if (excludeType) {
      unreadQuery.type = { $ne: excludeType };
    }

    const [rows, total, unreadCount] = await Promise.all([
      InAppNotification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InAppNotification.countDocuments(query),
      InAppNotification.countDocuments(unreadQuery),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications: rows.map((row) =>
          mapInAppNotification(row as Record<string, unknown>),
        ),
        unreadCount,
        pagination: pagination(page, limit, total),
      },
    });
  } catch (error) {
    console.error("GET /api/notifications", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

/** POST /api/notifications/read-all — mark all as read. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    await connectDB();
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.action !== "read_all") {
      return NextResponse.json(
        { success: false, error: "Unsupported action" },
        { status: 400 },
      );
    }

    const result = await InAppNotification.updateMany(
      { userId: toObjectId(auth.user.id), isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    return NextResponse.json({
      success: true,
      data: { markedRead: result.modifiedCount },
    });
  } catch (error) {
    console.error("POST /api/notifications", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}
