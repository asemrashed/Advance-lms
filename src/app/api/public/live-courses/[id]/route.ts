import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import {
  getInstructorDisplayName,
  INSTRUCTOR_USER_SELECT,
  mapInstructorProfile,
} from "@/app/api/_lib/instructorProfile";
import { listRoutineSlotsForBatch } from "@/app/api/_lib/batchAccess";
import {
  mapPublicBatch,
  publicBatchDetailExtras,
} from "@/app/api/_lib/mapPublicBatch";
import { resolveLiveCoursePrice, coursePricingFromLean, resolveCourseDiscountPercentage } from "@/lib/courses/liveCoursePricing";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/public/live-courses/[id] — live course bundle for enrollment page. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const course = await Course.findOne({
      _id: id,
      status: "published",
      isHidden: { $ne: true },
      courseType: "live",
    })
      .populate("instructor", INSTRUCTOR_USER_SELECT)
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Live course not found" },
        { status: 404 },
      );
    }

    const courseData = course as Record<string, unknown>;
    const coursePricing = coursePricingFromLean(courseData);
    const finalPrice = resolveLiveCoursePrice(coursePricing);
    const price = coursePricing.price ?? 0;
    const salePrice = coursePricing.salePrice;
    const discountPercentage = resolveCourseDiscountPercentage(coursePricing);

    const instructorUser = courseData.instructor as
      | Record<string, unknown>
      | null
      | undefined;
    const instructor = instructorUser?._id
      ? mapInstructorProfile(instructorUser)
      : undefined;

    const [chapters, batches] = await Promise.all([
      Chapter.find({
        course: id,
        batchId: { $exists: false },
        isPublished: true,
      })
        .sort({ order: 1 })
        .lean(),
      Batch.find({
        courseId: id,
        isActive: true,
      })
        .populate("instructorId", INSTRUCTOR_USER_SELECT)
        .sort({ startDate: 1 })
        .lean(),
    ]);

    const chapterIds = chapters.map((ch) => ch._id);
    const lessons =
      chapterIds.length === 0
        ? []
        : await Lesson.find({
            chapter: { $in: chapterIds },
            batchId: { $exists: false },
          })
            .sort({ order: 1 })
            .select("chapter title order duration lessonType isFree")
            .lean();

    const lessonsByChapter = new Map<string, typeof lessons>();
    for (const lesson of lessons) {
      const key = String(lesson.chapter);
      const list = lessonsByChapter.get(key) ?? [];
      list.push(lesson);
      lessonsByChapter.set(key, list);
    }

    // Hide blank chapters until the instructor adds lessons/content.
    const visibleChapters = chapters.filter(
      (ch) => (lessonsByChapter.get(String(ch._id))?.length ?? 0) > 0,
    );

    const batchIds = batches.map((b) => b._id);
    const countRows =
      batchIds.length === 0
        ? []
        : await Enrollment.aggregate([
            {
              $match: {
                selectedBatchId: { $in: batchIds },
                status: { $in: ["enrolled", "in_progress", "completed"] },
                paymentStatus: "paid",
              },
            },
            { $group: { _id: "$selectedBatchId", count: { $sum: 1 } } },
          ]);
    const countMap = new Map(
      countRows.map((r) => [String(r._id), Number(r.count) || 0]),
    );

    const batchRows = await Promise.all(
      batches.map(async (batch) => {
        const enrolledCount = countMap.get(String(batch._id)) ?? 0;
        const mapped = mapPublicBatch(
          batch as Record<string, unknown>,
          enrolledCount,
          coursePricing,
        );
        const slots = await listRoutineSlotsForBatch(String(batch._id));
        return {
          batch: mapped,
          ...publicBatchDetailExtras(slots),
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        course: {
          _id: String(courseData._id),
          courseType: normalizeCourseType(courseData.courseType),
          title: String(courseData.title ?? ""),
          shortDescription:
            typeof courseData.shortDescription === "string"
              ? courseData.shortDescription
              : undefined,
          description:
            typeof courseData.description === "string"
              ? courseData.description
              : undefined,
          thumbnailUrl:
            typeof courseData.thumbnailUrl === "string"
              ? courseData.thumbnailUrl
              : undefined,
          grade:
            typeof courseData.grade === "string" ? courseData.grade : undefined,
          subjectName:
            typeof courseData.subjectName === "string"
              ? courseData.subjectName
              : undefined,
          isPaid: coursePricing.isPaid,
          price: coursePricing.price,
          salePrice: coursePricing.salePrice || undefined,
          monthlyPrice:
            typeof courseData.monthlyPrice === "number" && courseData.monthlyPrice > 0
              ? courseData.monthlyPrice
              : undefined,
          finalPrice,
          discountPercentage,
          instructor: instructor
            ? {
                ...instructor,
                name: getInstructorDisplayName(instructorUser!),
              }
            : undefined,
          features: Array.isArray(courseData.features)
            ? courseData.features.map((f) => String(f)).filter(Boolean)
            : [],
        },
        chapters: visibleChapters.map((ch) => ({
          _id: String(ch._id),
          title: String(ch.title ?? ""),
          description:
            typeof ch.description === "string" ? ch.description : undefined,
          order: Number(ch.order) || 0,
          lessons: (lessonsByChapter.get(String(ch._id)) ?? []).map((l) => ({
            _id: String(l._id),
            title: String(l.title ?? ""),
            order: Number(l.order) || 0,
            duration: typeof l.duration === "number" ? l.duration : undefined,
            lessonType: l.lessonType || "recorded",
            isFree: Boolean(l.isFree),
          })),
        })),
        batches: batchRows,
      },
    });
  } catch (error) {
    console.error("GET /api/public/live-courses/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch live course" },
      { status: 500 },
    );
  }
}
