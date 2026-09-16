import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import BlogPost from "@/models/BlogPost";
import { mapBlogCategory, toSlug } from "@/app/api/_lib/blog";
import {
  parseLimit,
  parsePage,
  pagination,
  requireSessionUser,
  escapeRegex,
} from "@/app/api/_lib/phase12";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 50, 200);
    const search = String(searchParams.get("search") || "").trim();
    const isActiveRaw = searchParams.get("isActive");

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { slug: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (isActiveRaw === "true") filter.isActive = true;
    else if (isActiveRaw === "false") filter.isActive = false;

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      BlogCategory.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogCategory.countDocuments(filter),
    ]);

    const categories = await Promise.all(
      rows.map(async (row) => {
        const postCount = await BlogPost.countDocuments({
          categoryId: row._id,
        });
        return mapBlogCategory(row as Record<string, unknown>, postCount);
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        categories,
        pagination: pagination(page, limit, total),
      },
    });
  } catch (error) {
    console.error("GET /api/blog-categories", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 },
      );
    }

    const slug = toSlug(name);
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Invalid category name" },
        { status: 400 },
      );
    }

    const existing = await BlogCategory.findOne({ slug }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Category with this name already exists" },
        { status: 409 },
      );
    }

    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;
    const created = await BlogCategory.create({ name, slug, isActive });

    return NextResponse.json({
      success: true,
      data: mapBlogCategory(created.toObject() as Record<string, unknown>, 0),
    });
  } catch (error) {
    if (error instanceof mongoose.Error && error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, error: "Invalid category payload" },
        { status: 400 },
      );
    }
    console.error("POST /api/blog-categories", error);
    return NextResponse.json(
      { success: false, error: "Failed to create blog category" },
      { status: 500 },
    );
  }
}
