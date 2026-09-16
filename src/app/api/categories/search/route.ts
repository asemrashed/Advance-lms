import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Category from "@/models/Category";
import Course from "@/models/Course";
import { isAdminAreaRole } from "@/lib/roles";
import {
  escapeRegex,
} from "@/app/api/_lib/phase12";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdminSession();
    if (authError) {
      return authError;
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const query = String(searchParams.get("q") || "").trim();
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 200);
    const isActiveRaw = searchParams.get("isActive");

    const filter: Record<string, unknown> = {};
    if (query) {
      filter.$or = [
        { name: { $regex: escapeRegex(query), $options: "i" } },
        { slug: { $regex: escapeRegex(query), $options: "i" } },
      ];
    }
    if (isActiveRaw === "true") {
      filter.isActive = true;
    } else if (isActiveRaw === "false") {
      filter.isActive = false;
    }

    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      Category.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Category.countDocuments(filter),
    ]);

    const rows = await Promise.all(
      categories.map(async (category: any) => {
        const count = await Course.countDocuments({
          $or: [
            { category: String(category.slug || "") },
            { category: String(category._id) },
            { category: String(category.name || "") },
          ],
        });
        return mapCategory(category, count);
      }),
    );

    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    return NextResponse.json({
      success: true,
      data: {
        categories: rows,
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
    console.error("Category search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search categories" },
      { status: 500 },
    );
  }
}
