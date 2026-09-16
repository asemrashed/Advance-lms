import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { getDisplayName } from "@/lib/displayName";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import { paymentDueAtForPendingLive } from "@/app/api/_lib/runningCoursePayment";
import {
  buildEnrollmentStats,
  getInstructorCourseIds,
  mapEnrollmentRow,
  requireInstructorJson,
  toPositiveInt,
} from "./_lib";

function mapBatchEnrollmentRow(
  row: Record<string, unknown>,
  batch: Record<string, unknown>,
  course: Record<string, unknown> | null,
  linkedCourseEnrollment?: Record<string, unknown> | null,
) {
  const studentPop = row.studentId as Record<string, unknown> | null;
  const courseLuInfo = course
    ? {
        _id: String(course._id ?? ""),
        title: course.title as string | undefined,
        description: (course.description ?? course.shortDescription) as
          | string
          | undefined,
        thumbnailUrl: course.thumbnailUrl as string | undefined,
        price: course.price as number | undefined,
        category: course.category as string | undefined,
        isPaid: Boolean(course.isPaid),
        courseType: "live" as const,
      }
    : undefined;

  const studentInfo =
    studentPop && typeof studentPop === "object"
      ? {
          _id: String(studentPop._id ?? ""),
          name: getDisplayName(studentPop),
          email: studentPop.email ? String(studentPop.email) : "",
          avatar: studentPop.avatar ? String(studentPop.avatar) : undefined,
        }
      : undefined;

  const status =
    row.status === "active"
      ? "enrolled"
      : row.status === "pending"
        ? "enrolled"
        : String(row.status);

  return {
    _id: String(row._id),
    student: studentInfo?._id || String(row.studentId ?? ""),
    course: String(batch.courseId ?? course?._id ?? ""),
    batchId: String(batch._id ?? ""),
    batchName: String(batch.name || ""),
    courseType: "live" as const,
    enrolledAt: (row.enrolledAt as Date).toISOString(),
    status,
    progress: 0,
    paymentStatus: linkedCourseEnrollment?.paymentStatus ?? row.paymentStatus,
    paymentAmount: linkedCourseEnrollment?.paymentAmount ?? row.paymentAmount,
    paymentId: linkedCourseEnrollment?.paymentId ?? row.paymentId,
    billingPlan: linkedCourseEnrollment?.billingPlan ?? row.billingPlan,
    accessBlocked: Boolean(row.accessBlocked),
    accessExpiresAt: (row.accessExpiresAt as Date | undefined)?.toISOString(),
    paymentDueAt: (row.paymentDueAt as Date | undefined)?.toISOString(),
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString(),
    courseLuInfo,
    studentInfo,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInstructorJson();
    if ("error" in auth && auth.error) return auth.error;
    const userId = auth.userId!;

    await connectDB();
    const courseIds = await getInstructorCourseIds(userId);
    if (courseIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          enrollments: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
          stats: buildEnrollmentStats([]),
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 100);
    const search = String(searchParams.get("search") || "").trim();
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const courseFilter = searchParams.get("course");
    const batchFilter = searchParams.get("batch");

    const match: Record<string, unknown> = { course: { $in: courseIds } };
    if (status) match.status = status;
    if (paymentStatus) match.paymentStatus = paymentStatus;
    if (courseFilter && mongoose.Types.ObjectId.isValid(courseFilter)) {
      match.course = new mongoose.Types.ObjectId(courseFilter);
    }

    const skipRecorded =
      batchFilter && mongoose.Types.ObjectId.isValid(batchFilter);

    const courseRows = skipRecorded
      ? []
      : ((await Enrollment.find(match)
          .populate({
            path: "course",
            select:
              "title shortDescription description thumbnailUrl category isPaid price instructor createdBy courseType",
          })
          .populate({
            path: "selectedBatchId",
            select: "name",
          })
          .populate({
            path: "student",
            select: "name email avatar phone",
          })
          .sort({ enrolledAt: -1 })
          .lean()) as unknown as Array<Record<string, unknown>>);

    const batchQuery: Record<string, unknown> = {
      courseId: courseFilter && mongoose.Types.ObjectId.isValid(courseFilter)
        ? new mongoose.Types.ObjectId(courseFilter)
        : { $in: courseIds },
    };
    if (batchFilter && mongoose.Types.ObjectId.isValid(batchFilter)) {
      batchQuery._id = new mongoose.Types.ObjectId(batchFilter);
    }

    const batches = await Batch.find(batchQuery)
      .select("_id name courseId")
      .lean();
    const batchIds = batches.map((b) => b._id);
    const batchById = new Map(batches.map((b) => [String(b._id), b]));
    const courseIdSet = [
      ...new Set(batches.map((b) => String(b.courseId)).filter(Boolean)),
    ];
    const courses = courseIdSet.length
      ? await Course.find({ _id: { $in: courseIdSet } })
          .select(
            "title shortDescription description thumbnailUrl category isPaid price courseType",
          )
          .lean()
      : [];
    const courseById = new Map(courses.map((c) => [String(c._id), c]));

    const beMatch: Record<string, unknown> = {
      batchId: { $in: batchIds },
      status: { $nin: ["dropped"] },
    };
    if (paymentStatus) beMatch.paymentStatus = paymentStatus;
    if (status === "suspended") beMatch.status = "suspended";
    if (status === "dropped") beMatch.status = "dropped";

    const batchRows =
      batchIds.length === 0
        ? []
        : ((await BatchEnrollment.find(beMatch)
            .populate({
              path: "studentId",
              select: "name email avatar phone",
            })
            .sort({ enrolledAt: -1 })
            .lean()) as unknown as Array<Record<string, unknown>>);

    const mappedCourse = courseRows.map((row) => {
      const courseType =
        (row.course as { courseType?: string } | null)?.courseType ||
        "recorded";
      const mapped = mapEnrollmentRow(row);
      return {
        ...mapped,
        courseType,
        batchId: mapped.batchId,
        batchName: mapped.batchName,
      };
    });

    const standaloneBatchIds = new Set(
      batches
        .filter((b) => !b.courseId)
        .map((b) => String(b._id)),
    );

    const mappedBatch = batchRows
      .filter((row) => standaloneBatchIds.has(String(row.batchId)))
      .map((row) => {
        const batch = batchById.get(String(row.batchId));
        if (!batch) return null;
        const course = courseById.get(String(batch.courseId)) || null;
        return mapBatchEnrollmentRow(
          row,
          batch as unknown as Record<string, unknown>,
          course as unknown as Record<string, unknown> | null,
        );
      })
      .filter(Boolean) as ReturnType<typeof mapBatchEnrollmentRow>[];

    let filtered = [...mappedCourse, ...mappedBatch] as Array<
      Record<string, unknown>
    >;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((row) => {
        const student = row.studentInfo as Record<string, unknown> | null;
        const course = row.courseLuInfo as Record<string, unknown> | null;
        const studentText = student
          ? `${getDisplayName(student)} ${student.email || ""}`
          : "";
        const courseText = course ? String(course.title || "") : "";
        const batchText = String(row.batchName || "");
        return (
          studentText.toLowerCase().includes(q) ||
          courseText.toLowerCase().includes(q) ||
          batchText.toLowerCase().includes(q)
        );
      });
    }

    filtered.sort((a, b) => {
      const aTime = new Date(String(a.enrolledAt || 0)).getTime();
      const bTime = new Date(String(b.enrolledAt || 0)).getTime();
      return bTime - aTime;
    });

    const total = filtered.length;
    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    const skip = (page - 1) * limit;
    const pageRows = filtered.slice(skip, skip + limit);
    const stats = buildEnrollmentStats(filtered);

    return NextResponse.json({
      success: true,
      data: {
        enrollments: pageRows,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Instructor enrollments list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch enrollments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInstructorJson();
    if ("error" in auth && auth.error) return auth.error;
    const userId = auth.userId!;

    const body = (await request.json()) as Record<string, unknown>;
    const studentId = String(body.student || "").trim();
    const courseId = String(body.course || "").trim();

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { success: false, error: "Valid student is required" },
        { status: 400 },
      );
    }
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Valid course is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const courseIds = await getInstructorCourseIds(userId);
    if (!courseIds.some((id) => String(id) === courseId)) {
      return NextResponse.json(
        { success: false, error: "Course not found or not authorized" },
        { status: 403 },
      );
    }

    const student = await User.findOne({ _id: studentId, role: "student" })
      .select("_id")
      .lean();
    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    const existing = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Student is already enrolled in this course" },
        { status: 409 },
      );
    }

    const courseDoc = await Course.findById(courseId)
      .select("isPaid price courseType")
      .lean();
    const isPaid = Boolean(courseDoc?.isPaid);
    const requestedPaymentStatus =
      typeof body.paymentStatus === "string" ? body.paymentStatus : undefined;

    if (isPaid && requestedPaymentStatus === "paid") {
      const transactionId = String(body.paymentId || "").trim();
      const verifiedPayment = transactionId
        ? await Payment.findOne({
            transactionId,
            status: "success",
            entityType: "course",
            user: studentId,
            course: courseId,
          })
            .select("_id")
            .lean()
        : null;

      if (!verifiedPayment) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A successful matching gateway transaction is required before creating a paid enrollment",
          },
          { status: 409 },
        );
      }
    }

    const paymentStatus = requestedPaymentStatus
      ? requestedPaymentStatus
      : isPaid
        ? "pending"
        : "paid";
    const isLivePending =
      isPaid &&
      paymentStatus === "pending" &&
      normalizeCourseType(courseDoc?.courseType) === "live";

    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      status: "enrolled",
      paymentStatus,
      paymentAmount:
        typeof body.paymentAmount === "number"
          ? body.paymentAmount
          : isPaid
            ? (courseDoc?.price ?? 0)
            : 0,
      paymentMethod:
        typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
      paymentId:
        typeof body.paymentId === "string" ? body.paymentId : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      ...(isLivePending
        ? { paymentDueAt: paymentDueAtForPendingLive() }
        : {}),
    });

    const populated = await Enrollment.findById(enrollment._id)
      .populate({
        path: "course",
        select:
          "title shortDescription description thumbnailUrl category isPaid price",
      })
      .populate({
        path: "student",
        select: "name email avatar",
      })
      .lean();

    if (!populated) {
      return NextResponse.json(
        { success: false, error: "Failed to load enrollment" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: mapEnrollmentRow(populated as unknown as Record<string, unknown>),
      },
      { status: 201 },
    );
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
    console.error("Instructor enrollment create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create enrollment" },
      { status: 500 },
    );
  }
}
