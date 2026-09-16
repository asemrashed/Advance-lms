import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import {
  countActivePaidEnrollmentsByBatchIds,
  mapBatch,
} from "@/app/api/_lib/batchAccess";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

import { canManageCourse } from "@/app/api/_lib/courseAccess";
import { inheritPermanentMeetLinkForCourse } from "@/app/api/_lib/batchMeetLink";
import { isAdminAreaRole } from "@/lib/roles";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
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
    if (!isAdminAreaRole(role) && role !== "instructor" && role !== "student") {
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

    const course = await Course.findById(id)
      .select("_id courseType instructor createdBy")
      .lean();
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }
    if (
      (isAdminAreaRole(role) || role === "instructor") &&
      !canManageCourse(course, userId, role)
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const includeInactive =
      isAdminAreaRole(role) &&
      new URL(request.url).searchParams.get("includeInactive") === "true";
    if (isAdminAreaRole(role) || role === "instructor") {
      await inheritPermanentMeetLinkForCourse(id);
    }
    const courseObjectId = new mongoose.Types.ObjectId(id);
    const batches = await Batch.find({
      $or: [{ courseId: courseObjectId }, { courseId: id }],
      ...(includeInactive ? {} : { isActive: { $ne: false } }),
    })
      .sort({ startDate: -1 })
      .lean();
    const countMap = await countActivePaidEnrollmentsByBatchIds(
      batches.map((b) => b._id),
    );

    return NextResponse.json({
      success: true,
      data: {
        courseId: id,
        courseType: normalizeCourseType(course.courseType),
        batches: batches.map((batch) =>
          mapBatch(batch as Record<string, unknown>, {
            enrolledCount: countMap.get(String(batch._id)) ?? 0,
          }),
        ),
      },
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/batches", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch course batches" },
      { status: 500 },
    );
  }
}
