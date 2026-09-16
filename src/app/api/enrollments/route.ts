import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import { liveCoursePricingError, normalizeCourseType } from "@/lib/courses/unifiedCourse";

function courseIdFromLeanRef(
  courseField: unknown,
): string {
  if (
    courseField &&
    typeof courseField === "object" &&
    "_id" in (courseField as object)
  ) {
    return String((courseField as { _id: unknown })._id);
  }
  return String(courseField ?? "");
}

/** GET /api/enrollments — current session user's enrollments only. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectDB();

    const enrollments = await Enrollment.find({ student: userId })
      .populate({
        path: "course",
        select:
          "title shortDescription description thumbnailUrl category isPaid price status",
      })
      .populate({
        path: "selectedBatchId",
        select: "name",
      })
      .sort({ enrolledAt: -1 })
      .lean();

    const data = (enrollments as unknown as Record<string, unknown>[]).map((row) => {
      const coursePop = row.course as Record<string, unknown> | null;
      const selectedBatch = row.selectedBatchId as Record<string, unknown> | null;
      const courseLuInfo =
        coursePop && typeof coursePop === "object"
          ? {
              _id: String(coursePop._id ?? ""),
              title: coursePop.title as string | undefined,
              description: (coursePop.description ??
                coursePop.shortDescription) as string | undefined,
              thumbnailUrl: coursePop.thumbnailUrl as string | undefined,
              price: coursePop.price as number | undefined,
              category: coursePop.category as string | undefined,
              isPaid: Boolean(coursePop.isPaid),
            }
          : undefined;

      return {
        _id: String(row._id),
        student: String(row.student),
        course: courseIdFromLeanRef(row.course),
        selectedBatchId: selectedBatch
          ? String(selectedBatch._id ?? "")
          : row.selectedBatchId
            ? String(row.selectedBatchId)
            : undefined,
        batchId: selectedBatch
          ? String(selectedBatch._id ?? "")
          : row.selectedBatchId
            ? String(row.selectedBatchId)
            : undefined,
        batchName: selectedBatch?.name ? String(selectedBatch.name) : undefined,
        enrolledAt: (row.enrolledAt as Date).toISOString(),
        status: row.status,
        progress: row.progress,
        lastAccessedAt: (row.lastAccessedAt as Date | undefined)?.toISOString(),
        completedAt: (row.completedAt as Date | undefined)?.toISOString(),
        droppedAt: (row.droppedAt as Date | undefined)?.toISOString(),
        suspendedAt: (row.suspendedAt as Date | undefined)?.toISOString(),
        paymentStatus: row.paymentStatus,
        paymentAmount: row.paymentAmount,
        paymentMethod: row.paymentMethod,
        paymentDueAt: (row.paymentDueAt as Date | undefined)?.toISOString(),
        paymentId: row.paymentId,
        notes: row.notes,
        createdAt: (row.createdAt as Date).toISOString(),
        updatedAt: (row.updatedAt as Date).toISOString(),
        courseLuInfo,
      };
    });

    return NextResponse.json({
      success: true,
      data: { enrollments: data },
    });
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch enrollments" },
      { status: 500 },
    );
  }
}

/** POST /api/enrollments — create enrollment for session user + course from body only. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const courseRaw = body.course;
    if (typeof courseRaw !== "string" || !courseRaw.trim()) {
      return NextResponse.json(
        { success: false, error: "Course is required" },
        { status: 400 },
      );
    }

    const courseId = courseRaw.trim();
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const studentExists = await User.findById(userId).select("_id").lean();
    if (!studentExists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const courseDoc = await Course.findOne({
      _id: courseId,
      status: "published",
      isHidden: { $ne: true },
    }).lean();

    if (!courseDoc) {
      return NextResponse.json(
        { success: false, error: "Course not found or not available" },
        { status: 404 },
      );
    }

    const liveEnrollmentError = liveCoursePricingError(
      normalizeCourseType(courseDoc.courseType),
    );
    if (liveEnrollmentError) {
      return NextResponse.json(
        { success: false, error: liveEnrollmentError },
        { status: 400 },
      );
    }

    const existing = await Enrollment.findOne({
      student: userId,
      course: courseId,
    }).lean();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Student is already enrolled in this course" },
        { status: 409 },
      );
    }

    const isPaid = Boolean(courseDoc.isPaid);
    const enrollment = await Enrollment.create({
      student: userId,
      course: courseId,
      status: "enrolled",
      paymentStatus: isPaid ? "pending" : "paid",
      paymentAmount: isPaid ? (courseDoc.price ?? 0) : 0,
    });

    const populated = await Enrollment.findById(enrollment._id)
      .populate({
        path: "course",
        select:
          "title shortDescription description thumbnailUrl category isPaid price status",
      })
      .lean();

    if (!populated) {
      return NextResponse.json(
        { success: false, error: "Failed to load enrollment" },
        { status: 500 },
      );
    }

    const coursePop = populated.course as unknown as Record<string, unknown> | null;
    const courseLuInfo =
      coursePop && typeof coursePop === "object"
        ? {
            _id: String(coursePop._id ?? ""),
            title: coursePop.title as string | undefined,
            description: (coursePop.description ??
              coursePop.shortDescription) as string | undefined,
            thumbnailUrl: coursePop.thumbnailUrl as string | undefined,
            price: coursePop.price as number | undefined,
            category: coursePop.category as string | undefined,
            isPaid: Boolean(coursePop.isPaid),
          }
        : undefined;

    const payload = {
      _id: String(populated._id),
      student: String(populated.student),
      course: courseIdFromLeanRef(populated.course),
      enrolledAt: (populated.enrolledAt as Date).toISOString(),
      status: populated.status,
      progress: populated.progress,
      lastAccessedAt: (populated.lastAccessedAt as Date | undefined)?.toISOString(),
      completedAt: (populated.completedAt as Date | undefined)?.toISOString(),
      droppedAt: (populated.droppedAt as Date | undefined)?.toISOString(),
      suspendedAt: (populated.suspendedAt as Date | undefined)?.toISOString(),
      paymentStatus: populated.paymentStatus,
      paymentAmount: populated.paymentAmount,
      paymentMethod: populated.paymentMethod,
      paymentId: populated.paymentId,
      notes: populated.notes,
      createdAt: (populated.createdAt as Date).toISOString(),
      updatedAt: (populated.updatedAt as Date).toISOString(),
      courseLuInfo,
    };

    return NextResponse.json({ success: true, data: payload }, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: "Student is already enrolled in this course" },
        { status: 409 },
      );
    }
    console.error("Error creating enrollment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create enrollment" },
      { status: 500 },
    );
  }
}
