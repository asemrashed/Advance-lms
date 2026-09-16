import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import { isAdminAreaRole } from "@/lib/roles";

function mapCourse(course: any) {
  return {
    _id: String(course._id),
    title: String(course.title || ""),
    status: String(course.status || "draft"),
    isPaid: Boolean(course.isPaid),
    price: typeof course.price === "number" ? course.price : 0,
    category: course.category || undefined,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);

    const courses = await Course.find({})
      .sort({ createdAt: -1 })
      .limit(Number.isFinite(limit) ? Math.min(limit, 500) : 100)
      .lean();

    return NextResponse.json({
      success: true,
      data: { courses: courses.map(mapCourse) },
    });
  } catch (error) {
    console.error("Admin courses error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin courses" },
      { status: 500 },
    );
  }
}
