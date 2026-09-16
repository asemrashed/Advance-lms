import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import {
  coursePricingFromLean,
  resolveCourseDiscountPercentage,
  resolveCourseFinalPrice,
} from "@/lib/courses/liveCoursePricing";
import { applyCourseCatalogFilters } from "@/app/api/_lib/courseFilters";
import {
  escapeRegex,
} from "@/app/api/_lib/phase12";
import { getInstructorDisplayName } from "@/app/api/_lib/instructorProfile";

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

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 100);
    const search = (searchParams.get("search") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const subjectId = (searchParams.get("subjectId") || "").trim();
    const instructorId = (searchParams.get("instructorId") || "").trim();
    const grade = (searchParams.get("grade") || "").trim();
    const pricing = (searchParams.get("pricing") || "").trim().toLowerCase();
    const isPaidParam = searchParams.get("isPaid");
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const sortByRaw = (searchParams.get("sortBy") || "createdAt").trim();
    const sortOrderRaw = (searchParams.get("sortOrder") || "desc").trim();

    const sortBy: SafeSortField = ALLOWED_SORT_FIELDS.includes(
      sortByRaw as SafeSortField,
    )
      ? (sortByRaw as SafeSortField)
      : "createdAt";
    const sortOrder = sortOrderRaw === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {
      status: "published",
      isHidden: { $ne: true },
    };

    const courseType = (searchParams.get("courseType") || "").trim().toLowerCase();
    if (courseType === "live" || courseType === "recorded") {
      filter.courseType = courseType;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { shortDescription: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    if (isPaidParam === "true" || pricing === "paid") {
      filter.isPaid = true;
    } else if (isPaidParam === "false" || pricing === "free") {
      filter.isPaid = false;
    }

    const minPrice = minPriceParam ? Number(minPriceParam) : undefined;
    const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;
    if (
      Number.isFinite(minPrice) ||
      Number.isFinite(maxPrice)
    ) {
      const priceRange: Record<string, number> = {};
      if (Number.isFinite(minPrice)) {
        priceRange.$gte = Number(minPrice);
      }
      if (Number.isFinite(maxPrice)) {
        priceRange.$lte = Number(maxPrice);
      }
      filter.price = priceRange;
    }

    const queryFilter = await applyCourseCatalogFilters(filter, {
      subjectId: subjectId || null,
      instructorId: instructorId || null,
      grade: grade || null,
    });

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [courses, total] = await Promise.all([
      Course.find(queryFilter)
        .populate("createdBy", "name role")
        .populate("instructor", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(queryFilter),
    ]);

    const safeCourses = courses.map((course: any) => {
      const pricing = coursePricingFromLean(course);
      const price = pricing.price ?? 0;
      const salePrice = pricing.salePrice;
      const isPaid = Boolean(pricing.isPaid);
      const finalPrice = resolveCourseFinalPrice(pricing);
      const discountPercentage = resolveCourseDiscountPercentage(pricing);

      const instructorName =
        getInstructorDisplayName(course.instructor as Record<string, unknown> | undefined) ||
        undefined;

      return {
        _id: String(course._id),
        courseType: course.courseType || "recorded",
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
        status: "published",
        isHidden: Boolean(course.isHidden),
        price,
        salePrice,
        monthlyPrice:
          typeof course.monthlyPrice === "number" && course.monthlyPrice > 0
            ? course.monthlyPrice
            : undefined,
        finalPrice,
        discountPercentage,
        displayOrder:
          typeof course.displayOrder === "number"
            ? course.displayOrder
            : undefined,
        duration:
          typeof course.duration === "number" ? course.duration : undefined,
        difficulty: course.difficulty || undefined,
        lessonCount:
          typeof course.lessonCount === "number" ? course.lessonCount : 0,
        tags: Array.isArray(course.tags) ? course.tags : [],
        instructor: course.instructor
          ? {
              _id: String(course.instructor._id),
              name: instructorName || "Instructor",
            }
          : undefined,
        createdBy: {
          name: course.createdBy?.name || "Unknown",
          role: course.createdBy?.role || "instructor",
        },
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };
    });

    const pages = total > 0 ? Math.ceil(total / limit) : 0;

    return NextResponse.json({
      success: true,
      data: {
        courses: safeCourses,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1 && pages > 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching public courses:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch public courses",
      },
      { status: 500 },
    );
  }
}
