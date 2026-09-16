import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import Chapter from "@/models/Chapter";
import { isAdminAreaRole } from "@/lib/roles";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/courses/[id]/curriculum-sources
 * Lists other live courses (excluding the current one) that the caller can
 * manage and that have course-level curriculum available to copy from.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
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
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const filter: Record<string, unknown> = {
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      courseType: "live",
    };
    if (role === "instructor") {
      filter.$or = [{ instructor: userId }, { createdBy: userId }];
    }

    const courses = await Course.find(filter)
      .select("_id title")
      .sort({ updatedAt: -1 })
      .lean();

    // Only surface courses that actually have course-level curriculum to copy.
    const courseIds = courses.map((c) => c._id);
    const withCurriculum = courseIds.length
      ? await Chapter.distinct("course", {
          course: { $in: courseIds },
          batchId: { $exists: false },
        })
      : [];
    const allowed = new Set(withCurriculum.map((c) => String(c)));

    return NextResponse.json({
      success: true,
      data: {
        courses: courses
          .filter((c) => allowed.has(String(c._id)))
          .map((c) => ({ _id: String(c._id), title: c.title || "Untitled" })),
      },
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/curriculum-sources", error);
    return NextResponse.json(
      { success: false, error: "Failed to load curriculum sources" },
      { status: 500 },
    );
  }
}
