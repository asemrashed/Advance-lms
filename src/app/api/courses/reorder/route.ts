import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import { isAdminAreaRole } from "@/lib/roles";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!isAdminAreaRole(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const body = (await request.json()) as {
      courseOrders?: Array<{ courseId: string; displayOrder: number }>;
    };

    const courseOrders = Array.isArray(body.courseOrders) ? body.courseOrders : [];
    if (courseOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: "courseOrders is required" },
        { status: 400 },
      );
    }

    for (const item of courseOrders) {
      if (
        !item.courseId ||
        !mongoose.Types.ObjectId.isValid(item.courseId) ||
        typeof item.displayOrder !== "number"
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid courseOrders entry" },
          { status: 400 },
        );
      }
    }

    await Promise.all(
      courseOrders.map((item) =>
        Course.updateOne(
          { _id: item.courseId },
          { $set: { displayOrder: item.displayOrder } },
        ),
      ),
    );

    return NextResponse.json({
      success: true,
      data: { updated: courseOrders.length },
    });
  } catch (error) {
    console.error("Course reorder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder courses" },
      { status: 500 },
    );
  }
}
