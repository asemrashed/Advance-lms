import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import { normalizeBatchGrade, isBatchGrade } from "@/lib/batchGrades";
import {
  enrichSubjectFields,
  buildSubjectFieldsFromBody,
  assertSubjectHasChapters,
} from "@/app/api/_lib/subjects";
import type { CourseType } from "@/types/unifiedCourse";
import { syncOrphanedPendingCourses } from "@/app/api/_lib/contentApproval";
import { parseFeaturesInput } from "@/app/api/_lib/batchMarketing";
import { buildSubjectFilter } from "@/app/api/_lib/courseFilters";
import { imageUrlError } from "@/lib/imageUrl";
import { getInstructorDisplayName } from "@/app/api/_lib/instructorProfile";
import { isAdminAreaRole } from "@/lib/roles";
import {
  escapeRegex,
} from "@/app/api/_lib/phase12";

type SafeSortField =
  | "createdAt"
  | "updatedAt"
  | "title"
  | "price"
  | "salePrice"
  | "displayOrder";

const ALLOWED_SORT_FIELDS: SafeSortField[] = [
  "createdAt",
  "updatedAt",
  "title",
  "price",
  "salePrice",
  "displayOrder",
];

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toObjectId(value: unknown): mongoose.Types.ObjectId | null {
  if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }
  return new mongoose.Types.ObjectId(value);
}

function mapCourse(course: any) {
  const price = typeof course.price === "number" ? course.price : 0;
  const salePrice =
    typeof course.salePrice === "number" ? course.salePrice : undefined;
  const monthlyPrice =
    typeof course.monthlyPrice === "number" && course.monthlyPrice > 0
      ? course.monthlyPrice
      : undefined;
  const isPaid = Boolean(course.isPaid);
  const finalPrice = isPaid ? (salePrice ?? price) : 0;
  const discountPercentage =
    isPaid && salePrice !== undefined && price > 0 && salePrice < price
      ? Math.round(((price - salePrice) / price) * 100)
      : 0;

  return {
    _id: String(course._id),
    courseType: normalizeCourseType(course.courseType) as CourseType,
    title: course.title || "",
    shortDescription: course.shortDescription || undefined,
    description: course.description || undefined,
    category: course.category || undefined,
    subjectId: course.subjectId ? String(course.subjectId) : undefined,
    subjectCode: course.subjectCode || undefined,
    subjectName: course.subjectName || undefined,
    grade: course.grade || undefined,
    thumbnailUrl: course.thumbnailUrl || undefined,
    isPaid,
    status: (course.status || "draft") as
      | "draft"
      | "published"
      | "archived"
      | "pending_approval",
    isHidden: Boolean(course.isHidden),
    price,
    salePrice,
    monthlyPrice,
    finalPrice,
    discountPercentage,
    displayOrder:
      typeof course.displayOrder === "number" ? course.displayOrder : undefined,
    duration: typeof course.duration === "number" ? course.duration : undefined,
    difficulty: course.difficulty || undefined,
    lessonCount: typeof course.lessonCount === "number" ? course.lessonCount : 0,
    enrollmentCount:
      typeof course.enrollmentCount === "number" ? course.enrollmentCount : 0,
    tags: Array.isArray(course.tags) ? course.tags : [],
    features: Array.isArray(course.features)
      ? course.features.map((f: unknown) => String(f)).filter(Boolean)
      : [],
    createdBy: course.createdBy
      ? {
          _id: String(course.createdBy._id || ""),
          name: String(course.createdBy.name || ""),
          email: String(course.createdBy.email || ""),
          role: String(course.createdBy.role || ""),
        }
      : undefined,
    instructor: course.instructor
      ? {
          _id: String(course.instructor._id || ""),
          name:
            String(course.instructor.name || "").trim() ||
            getInstructorDisplayName(course.instructor as Record<string, unknown>),
          email: String(course.instructor.email || ""),
          role: String(course.instructor.role || "instructor"),
        }
      : undefined,
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
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    await syncOrphanedPendingCourses();

    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 500);
    const search = (searchParams.get("search") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const sortByRaw = (searchParams.get("sortBy") || "createdAt").trim();
    const sortOrderRaw = (searchParams.get("sortOrder") || "desc").trim();
    const createdBy = (searchParams.get("createdBy") || "").trim();
    const isPaidParam = searchParams.get("isPaid");
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");

    const sortBy: SafeSortField = ALLOWED_SORT_FIELDS.includes(
      sortByRaw as SafeSortField,
    )
      ? (sortByRaw as SafeSortField)
      : "createdAt";
    const sortOrder: 1 | -1 = sortOrderRaw === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};

    if (role === "instructor") {
      filter.$or = [
        { instructor: new mongoose.Types.ObjectId(userId) },
        { createdBy: new mongoose.Types.ObjectId(userId) },
      ];
    }

    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { shortDescription: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (category && category !== "all") {
      const subjectClause = {
        $or: [
          { category },
          { subjectCode: category.toUpperCase() },
          { subjectName: category },
        ],
      };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or as unknown[] }, subjectClause];
        delete filter.$or;
      } else {
        Object.assign(filter, subjectClause);
      }
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (createdBy && createdBy !== "all" && isAdminAreaRole(role)) {
      const createdByObjectId = toObjectId(createdBy);
      if (createdByObjectId) {
        filter.createdBy = createdByObjectId;
      }
    }
    if (isPaidParam === "true") {
      filter.isPaid = true;
    } else if (isPaidParam === "false") {
      filter.isPaid = false;
    }

    const minPrice = minPriceParam ? Number(minPriceParam) : undefined;
    const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      const priceRange: Record<string, number> = {};
      if (Number.isFinite(minPrice)) {
        priceRange.$gte = Number(minPrice);
      }
      if (Number.isFinite(maxPrice)) {
        priceRange.$lte = Number(maxPrice);
      }
      filter.price = priceRange;
    }

    const courseTypeParam = (searchParams.get("courseType") || "").trim();
    if (courseTypeParam === "recorded" || courseTypeParam === "live") {
      filter.courseType = courseTypeParam;
    }

    const gradeParam = (searchParams.get("grade") || "").trim();
    if (gradeParam && gradeParam !== "all") {
      filter.grade = isBatchGrade(gradeParam)
        ? normalizeBatchGrade(gradeParam)
        : gradeParam.toUpperCase();
    }

    const subjectIdParam = (searchParams.get("subjectId") || "").trim();
    const subjectFilter = subjectIdParam
      ? await buildSubjectFilter(subjectIdParam)
      : null;
    if (subjectFilter) {
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or as unknown[] }, subjectFilter];
        delete filter.$or;
      } else if (filter.$and) {
        (filter.$and as unknown[]).push(subjectFilter);
      } else {
        Object.assign(filter, subjectFilter);
      }
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [courses, total, statsRows] = await Promise.all([
      Course.find(filter)
        .populate("createdBy", "name email role")
        .populate("instructor", "name email role")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
      Course.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCourses: { $sum: 1 },
            publishedCourses: {
              $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
            },
            draftCourses: {
              $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
            },
            pendingApprovalCourses: {
              $sum: {
                $cond: [{ $eq: ["$status", "pending_approval"] }, 1, 0],
              },
            },
            archivedCourses: {
              $sum: { $cond: [{ $eq: ["$status", "archived"] }, 1, 0] },
            },
            paidCourses: {
              $sum: { $cond: [{ $eq: ["$isPaid", true] }, 1, 0] },
            },
            freeCourses: {
              $sum: { $cond: [{ $eq: ["$isPaid", false] }, 1, 0] },
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ["$isPaid", true] },
                  { $ifNull: ["$price", 0] },
                  0,
                ],
              },
            },
            averagePrice: {
              $avg: {
                $cond: [{ $eq: ["$isPaid", true] }, { $ifNull: ["$price", 0] }, null],
              },
            },
          },
        },
      ]),
    ]);

    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    const stats = statsRows[0] || {
      totalCourses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      pendingApprovalCourses: 0,
      archivedCourses: 0,
      paidCourses: 0,
      freeCourses: 0,
      totalRevenue: 0,
      averagePrice: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        courses: courses.map(mapCourse),
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1 && pages > 0,
        },
        stats: {
          ...stats,
          averagePrice: Number(stats.averagePrice || 0),
          categories: {},
        },
      },
    });
  } catch (error) {
    console.error("Courses list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}

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
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;

    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json(
        { success: false, error: "Course title is required" },
        { status: 400 },
      );
    }

    const instructorFromBody = toObjectId(body.instructor);
    const createdBy = new mongoose.Types.ObjectId(userId);
    const instructor =
      role === "instructor"
        ? createdBy
        : instructorFromBody || undefined;

    const isPaid = Boolean(body.isPaid);
    const courseType = normalizeCourseType(body.courseType);

    const price =
      typeof body.price === "number"
        ? body.price
        : Number.isFinite(Number(body.price))
          ? Number(body.price)
          : undefined;
    const salePrice =
      typeof body.salePrice === "number"
        ? body.salePrice
        : Number.isFinite(Number(body.salePrice))
          ? Number(body.salePrice)
          : undefined;
    const monthlyPrice =
      typeof body.monthlyPrice === "number"
        ? body.monthlyPrice
        : Number.isFinite(Number(body.monthlyPrice))
          ? Number(body.monthlyPrice)
          : undefined;

    const subjectInput = buildSubjectFieldsFromBody(body);
    const subjectFields = await enrichSubjectFields(subjectInput);
    const grade =
      subjectFields.grade && isBatchGrade(subjectFields.grade)
        ? normalizeBatchGrade(subjectFields.grade)
        : subjectFields.grade || undefined;

    if (!subjectFields.subjectId) {
      return NextResponse.json(
        { success: false, error: "Subject is required" },
        { status: 400 },
      );
    }

    if (courseType === "live" && !grade) {
      return NextResponse.json(
        { success: false, error: "Class / grade is required for live courses" },
        { status: 400 },
      );
    }

    const thumbnailUrl = String(body.thumbnailUrl || "").trim();
    const thumbnailError = imageUrlError(thumbnailUrl);
    if (thumbnailError) {
      return NextResponse.json(
        { success: false, error: thumbnailError },
        { status: 400 },
      );
    }

    // Instructors always create as draft; approval is requested only via explicit publish update.
    const initialStatus =
      role === "instructor"
        ? "draft"
        : body.status === "published" || body.status === "archived"
          ? body.status
          : "draft";

    const course = await Course.create({
      courseType,
      title,
      shortDescription: String(body.shortDescription || "").trim() || undefined,
      description: String(body.description || "").trim() || undefined,
      category: subjectFields.subjectName || String(body.category || "").trim() || undefined,
      subjectId: new mongoose.Types.ObjectId(subjectFields.subjectId),
      subjectCode: subjectFields.subjectCode || undefined,
      subjectName: subjectFields.subjectName || undefined,
      grade,
      thumbnailUrl: thumbnailUrl || undefined,
      isPaid,
      status: initialStatus,
      isHidden: Boolean(body.isHidden),
      price: !isPaid ? undefined : price,
      salePrice: !isPaid ? undefined : salePrice,
      monthlyPrice: !isPaid ? undefined : (monthlyPrice && monthlyPrice > 0 ? monthlyPrice : undefined),
      displayOrder:
        typeof body.displayOrder === "number"
          ? body.displayOrder
          : undefined,
      createdBy,
      instructor,
      features: parseFeaturesInput(body.features),
    });

    // Subject must define chapters; instructors add them onto the course
    // via Curriculum Builder (Add Chapter) rather than auto-seeding blanks.
    const subjectChapters = await assertSubjectHasChapters(
      subjectFields.subjectId,
    );
    if (subjectChapters.error) {
      await Course.findByIdAndDelete(course._id);
      return NextResponse.json(
        { success: false, error: subjectChapters.error },
        { status: 400 },
      );
    }

    const populated = await Course.findById(course._id)
      .populate("createdBy", "name email role")
      .populate("instructor", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      data: mapCourse(populated),
    });
  } catch (error) {
    console.error("Course create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create course" },
      { status: 500 },
    );
  }
}
