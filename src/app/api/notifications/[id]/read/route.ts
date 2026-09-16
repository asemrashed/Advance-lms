import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import InAppNotification from "@/models/InAppNotification";
import { mapInAppNotification } from "@/app/api/_lib/scheduleNotifications";
import { isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid notification id" },
        { status: 400 },
      );
    }

    const updated = await InAppNotification.findOneAndUpdate(
      { _id: toObjectId(id), userId: toObjectId(auth.user.id) },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        notification: mapInAppNotification(updated as Record<string, unknown>),
      },
    });
  } catch (error) {
    console.error("PATCH /api/notifications/[id]/read", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark notification read" },
      { status: 500 },
    );
  }
}
