import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import {
  coursePricingFromLean,
  resolveCourseDiscountPercentage,
  resolveCourseFinalPrice,
} from "@/lib/courses/liveCoursePricing";
import { getInstructorDisplayName } from "@/app/api/_lib/instructorProfile";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function mapCourseRow(course: Record<string, unknown>) {
  const pricing = coursePricingFromLean(course);
  const price = pricing.price ?? 0;
  const salePrice = pricing.salePrice;
  const isPaid = Boolean(pricing.isPaid);
  const finalPrice = resolveCourseFinalPrice(pricing);
  const discountPercentage = resolveCourseDiscountPercentage(pricing);

  const instructor = course.instructor as
    | { name?: string; _id?: unknown }
    | undefined;
  const instructorName = getInstructorDisplayName(
    instructor as Record<string, unknown> | undefined,
  ) || undefined;

  return {
    _id: String(course._id),
    courseType: course.courseType || "recorded",
    title: course.title || "",
    shortDescription: course.shortDescription || undefined,
    category: course.category || undefined,
    subjectId: course.subjectId ? String(course.subjectId) : undefined,
    subjectCode: course.subjectCode || undefined,
    subjectName: course.subjectName || undefined,
    grade: course.grade || undefined,
    thumbnailUrl: course.thumbnailUrl || undefined,
    isPaid,
    status: "published",
    price,
    salePrice,
    monthlyPrice:
      typeof course.monthlyPrice === "number" && course.monthlyPrice > 0
        ? course.monthlyPrice
        : undefined,
    finalPrice,
    discountPercentage,
    difficulty: course.difficulty || undefined,
    lessonCount:
      typeof course.lessonCount === "number" ? course.lessonCount : 0,
    tags: Array.isArray(course.tags) ? course.tags : [],
    instructor: instructor?._id
      ? {
          _id: String(instructor._id),
          name: instructorName || "Instructor",
        }
      : undefined,
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const limitParam = _request.nextUrl.searchParams.get("limit");
    const limit = Math.min(
      Math.max(Number.parseInt(limitParam || "4", 10) || 4, 1),
      8,
    );

    const current = await Course.findOne({
      _id: id,
      status: "published",
      isHidden: { $ne: true },
    }).lean();

    if (!current) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    const subjectId = current.subjectId ? String(current.subjectId) : "";
    const grade = String(current.grade || "").trim();
    const courseType = current.courseType || "recorded";

    const orConditions: Record<string, unknown>[] = [];
    if (subjectId) {
      orConditions.push({ subjectId });
    }
    if (grade) {
      orConditions.push({ grade });
    }

    if (orConditions.length === 0) {
      return NextResponse.json({
        success: true,
        data: { courses: [] },
      });
    }

    const candidates = await Course.find({
      _id: { $ne: id },
      status: "published",
      isHidden: { $ne: true },
      courseType,
      $or: orConditions,
    })
      .populate("instructor", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .lean();

    const ranked = candidates
      .map((course) => {
        const row = course as Record<string, unknown>;
        const matchesSubject =
          Boolean(subjectId) &&
          String(row.subjectId || "") === subjectId;
        const matchesGrade = Boolean(grade) && String(row.grade || "") === grade;
        const score = (matchesSubject ? 2 : 0) + (matchesGrade ? 1 : 0);
        return { row, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ row }) => mapCourseRow(row));

    return NextResponse.json({
      success: true,
      data: { courses: ranked },
    });
  } catch (error) {
    console.error("GET /api/public/courses/[id]/recommended", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recommended courses" },
      { status: 500 },
    );
  }
}
