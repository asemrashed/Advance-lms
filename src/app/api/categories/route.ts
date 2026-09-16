import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Category from "@/models/Category";
import Course from "@/models/Course";
import { isAdminAreaRole } from "@/lib/roles";
import {
  escapeRegex,
} from "@/app/api/_lib/phase12";

type SafeSortField = "name" | "createdAt" | "updatedAt";

const ALLOWED_SORT_FIELDS: SafeSortField[] = ["name", "createdAt", "updatedAt"];

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function mapCategory(category: any, courseCount = 0) {
  return {
    _id: String(category._id),
    name: String(category.name || ""),
    description: undefined,
    color: undefined,
    icon: undefined,
    slug: String(category.slug || ""),
    isActive: category.isActive !== false,
    courseCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function requireAdminSession() {
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
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdminSession();
    if (authError) {
      return authError;
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 200);
    const search = String(searchParams.get("search") || "").trim();
    const isActiveRaw = searchParams.get("isActive");
    const sortByRaw = String(searchParams.get("sortBy") || "createdAt").trim();
    const sortOrderRaw = String(searchParams.get("sortOrder") || "desc").trim();
    const sortBy: SafeSortField = ALLOWED_SORT_FIELDS.includes(
      sortByRaw as SafeSortField,
    )
      ? (sortByRaw as SafeSortField)
      : "createdAt";
    const sortOrder: 1 | -1 = sortOrderRaw === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { slug: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (isActiveRaw === "true") {
      filter.isActive = true;
    } else if (isActiveRaw === "false") {
      filter.isActive = false;
    }

    const skip = (page - 1) * limit;
    const [categories, total, activeCategories] = await Promise.all([
      Category.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(filter),
      Category.countDocuments({ ...filter, isActive: true }),
    ]);

    const categoryRows = await Promise.all(
      categories.map(async (category: any) => {
        const identifier = String(category.slug || "").trim();
        const fallbackSlug = toSlug(String(category.name || ""));
        const matchSlug = identifier || fallbackSlug;
        const count = await Course.countDocuments({
          $or: [
            { category: matchSlug },
            { category: String(category._id) },
            { category: String(category.name || "") },
          ],
        });
        return mapCategory(category, count);
      }),
    );

    const categoriesWithCourses = categoryRows.filter(
      (category) => category.courseCount > 0,
    ).length;
    const pages = total > 0 ? Math.ceil(total / limit) : 0;

    return NextResponse.json({
      success: true,
      data: {
        categories: categoryRows,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1 && pages > 0,
        },
        stats: {
          totalCategories: total,
          activeCategories,
          inactiveCategories: Math.max(total - activeCategories, 0),
          categoriesWithCourses,
        },
      },
    });
  } catch (error) {
    console.error("Category list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdminSession();
    if (authError) {
      return authError;
    }

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 },
      );
    }

    const normalizedSlug = toSlug(name);
    if (!normalizedSlug) {
      return NextResponse.json(
        { success: false, error: "Invalid category name" },
        { status: 400 },
      );
    }

    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;
    const existing = await Category.findOne({ slug: normalizedSlug })
      .select("_id")
      .lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Category with this name already exists" },
        { status: 409 },
      );
    }

    const created = await Category.create({
      name,
      slug: normalizedSlug,
      isActive,
    });

    return NextResponse.json({
      success: true,
      data: mapCategory(created.toObject(), 0),
    });
  } catch (error) {
    if (
      error instanceof mongoose.Error &&
      error.name === "ValidationError"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid category payload" },
        { status: 400 },
      );
    }
    console.error("Category create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 },
    );
  }
}
