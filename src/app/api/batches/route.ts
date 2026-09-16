import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import {
  buildWeeklyRoutineFromSlots,
  countActivePaidEnrollmentsByBatchIds,
  instructorAccessibleBatchFilter,
  listRoutineSlotsForBatch,
  mapBatch,
  studentEnrolledBatchIds,
} from "@/app/api/_lib/batchAccess";
import { parseInstructorIdsInput } from "@/app/api/_lib/batchInstructors";
import {
  parseBatchMarketingBody,
  validateBatchMarketingForCreate,
} from "@/app/api/_lib/batchMarketing";
import {
  pagination,
  parseLimit,
  parsePage,
  requireSessionUser,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import { normalizeBatchGrade } from "@/lib/batchGrades";
import { canManageCourse } from "@/app/api/_lib/courseAccess";
import { resolveCourseMeetLink } from "@/app/api/_lib/batchMeetLink";
import { normalizeMeetLink } from "@/lib/meetLink";
import {
  parseBatchDate,
  parseMaxStudents,
} from "@/app/api/_lib/batchFieldValidation";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 20, 100);
    const skip = (page - 1) * limit;
    const search = (searchParams.get("search") || "").trim();
    const courseId = (searchParams.get("courseId") || "").trim();

    const filter: Record<string, unknown> = {};

    if (auth.user.role === "instructor") {
      Object.assign(filter, await instructorAccessibleBatchFilter(auth.user.id));
    } else if (auth.user.role === "student") {
      const batchIds = await studentEnrolledBatchIds(auth.user.id);
      if (batchIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { batches: [] },
          pagination: pagination(page, limit, 0),
        });
      }
      filter._id = { $in: batchIds };
    }

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return NextResponse.json(
          { success: false, error: "Invalid courseId" },
          { status: 400 },
        );
      }
      filter.courseId = new mongoose.Types.ObjectId(courseId);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { subject: { $regex: escapeRegex(search), $options: "i" } },
        { grade: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const [batches, total] = await Promise.all([
      Batch.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
      Batch.countDocuments(filter),
    ]);

    const countMap = await countActivePaidEnrollmentsByBatchIds(
      batches.map((b) => b._id),
    );

    return NextResponse.json({
      success: true,
      data: {
        batches: batches.map((b) =>
          mapBatch(b as Record<string, unknown>, {
            enrolledCount: countMap.get(String(b._id)) ?? 0,
          }),
        ),
      },
      pagination: pagination(page, limit, total),
    });
  } catch (error) {
    console.error("GET /api/batches", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch batches" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 },
      );
    }

    const instructorParse = await parseInstructorIdsInput(body, auth.user);
    if (instructorParse.error) {
      return NextResponse.json(
        { success: false, error: instructorParse.error },
        { status: 400 },
      );
    }

    const startDate = parseBatchDate(body.startDate);
    const endDate = parseBatchDate(body.endDate);
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Valid startDate and endDate are required" },
        { status: 400 },
      );
    }
    if (startDate.getTime() > endDate.getTime()) {
      return NextResponse.json(
        { success: false, error: "startDate must be on or before endDate" },
        { status: 400 },
      );
    }

    const maxStudents = parseMaxStudents(body.maxStudents);
    if (maxStudents === null) {
      return NextResponse.json(
        { success: false, error: "maxStudents must be a positive integer" },
        { status: 400 },
      );
    }

    const rawMonthlyFee = body.monthlyFee !== undefined && body.monthlyFee !== null && body.monthlyFee !== ''
      ? Number(body.monthlyFee)
      : undefined;

    const marketing = parseBatchMarketingBody(body);
    const marketingErrors = validateBatchMarketingForCreate({
      name,
      thumbnailUrl: marketing.thumbnailUrl,
      shortDescription: marketing.shortDescription,
    });
    if (marketingErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: marketingErrors.join(". ") },
        { status: 400 },
      );
    }

    const courseIdRaw =
      typeof body.courseId === "string" ? body.courseId.trim() : "";
    let courseObjectId: mongoose.Types.ObjectId | undefined;
    let parentCourseGrade: string | undefined;
    if (courseIdRaw) {
      if (!mongoose.Types.ObjectId.isValid(courseIdRaw)) {
        return NextResponse.json(
          { success: false, error: "Invalid courseId" },
          { status: 400 },
        );
      }
      const parentCourse = await Course.findById(courseIdRaw)
        .select("_id courseType grade instructor createdBy")
        .lean();
      if (!parentCourse) {
        return NextResponse.json(
          { success: false, error: "Parent course not found" },
          { status: 404 },
        );
      }
      if (
        auth.user.role === "instructor" &&
        !canManageCourse(parentCourse, auth.user.id, auth.user.role)
      ) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
      if (normalizeCourseType(parentCourse.courseType) !== "live") {
        return NextResponse.json(
          {
            success: false,
            error: "Batches can only be linked to live courses",
          },
          { status: 400 },
        );
      }
      courseObjectId = new mongoose.Types.ObjectId(courseIdRaw);
      parentCourseGrade =
        typeof parentCourse.grade === "string"
          ? parentCourse.grade.trim()
          : undefined;
    }

    let instructorIds = instructorParse.ids;
    // Instructors creating a batch on their course are always assigned.
    if (
      auth.user.role === "instructor" &&
      !instructorIds.some((id) => String(id) === auth.user.id)
    ) {
      instructorIds = [new mongoose.Types.ObjectId(auth.user.id), ...instructorIds];
    }
    const batchGrade = courseObjectId
      ? normalizeBatchGrade(parentCourseGrade)
      : marketing.grade;
    const inheritedMeetLink = courseIdRaw
      ? await resolveCourseMeetLink(courseIdRaw)
      : "";
    const meetLink =
      normalizeMeetLink(body.meetLink) || inheritedMeetLink || undefined;
    const batch = await Batch.create({
      courseId: courseObjectId,
      name,
      subject,
      instructorIds,
      instructorId: instructorIds[0],
      grade: batchGrade,
      meetLink,
      schedule: [],
      startDate,
      endDate,
      maxStudents,
      monthlyFee:
        rawMonthlyFee && Number.isFinite(rawMonthlyFee) && rawMonthlyFee > 0
          ? rawMonthlyFee
          : undefined,
      isActive: body.isActive !== false,
      approvalStatus: "approved",
      description: marketing.description,
      shortDescription: marketing.shortDescription,
      thumbnailUrl: marketing.thumbnailUrl,
      videoUrl: marketing.videoUrl,
      features: marketing.features,
    });

    const mapped = mapBatch(batch.toObject() as Record<string, unknown>);
    const slots = await listRoutineSlotsForBatch(String(batch._id));

    return NextResponse.json(
      {
        success: true,
        data: {
          batch: mapped,
          routine: buildWeeklyRoutineFromSlots(slots),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/batches", error);
    return NextResponse.json(
      { success: false, error: "Failed to create batch" },
      { status: 500 },
    );
  }
}
