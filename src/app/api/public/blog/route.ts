import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import BlogPost from "@/models/BlogPost";
import { mapBlogPost } from "@/app/api/_lib/blog";
import {
  parseLimit,
  parsePage,
  pagination,
  escapeRegex,
} from "@/app/api/_lib/phase12";

const POPULATE = [
  { path: "categoryId", select: "name slug isActive" },
  { path: "authorId", select: "name email" },
];

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 12, 50);
    const search = String(searchParams.get("search") || "").trim();
    const categoryId = String(searchParams.get("categoryId") || "").trim();
    const categorySlug = String(searchParams.get("category") || "").trim();

    const filter: Record<string, unknown> = {
      status: "published",
      isActive: true,
    };

    if (search) {
      const matchingCategories = await BlogCategory.find({
        isActive: true,
        $or: [
          { name: { $regex: escapeRegex(search), $options: "i" } },
          { slug: { $regex: escapeRegex(search), $options: "i" } },
        ],
      })
        .select("_id")
        .lean();
      const matchingCategoryIds = matchingCategories.map((c) => c._id);

      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { excerpt: { $regex: escapeRegex(search), $options: "i" } },
        { content: { $regex: escapeRegex(search), $options: "i" } },
        ...(matchingCategoryIds.length
          ? [{ categoryId: { $in: matchingCategoryIds } }]
          : []),
      ];
    }

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = categoryId;
    } else if (categorySlug && categorySlug !== "all") {
      const category = await BlogCategory.findOne({
        slug: categorySlug,
        isActive: true,
      })
        .select("_id")
        .lean();
      if (!category) {
        return NextResponse.json({
          success: true,
          data: {
            posts: [],
            pagination: pagination(page, limit, 0),
          },
        });
      }
      filter.categoryId = category._id;
    }

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      BlogPost.find(filter)
        .populate(POPULATE)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogPost.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        posts: rows.map((row) => mapBlogPost(row as Record<string, unknown>)),
        pagination: pagination(page, limit, total),
      },
    });
  } catch (error) {
    console.error("GET /api/public/blog", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog posts" },
      { status: 500 },
    );
  }
}
