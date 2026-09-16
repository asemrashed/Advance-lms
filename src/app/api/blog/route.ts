import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import BlogPost from "@/models/BlogPost";
import {
  ensureUniqueBlogSlug,
  isEmptyHtml,
  mapBlogPost,
  toSlug,
} from "@/app/api/_lib/blog";
import {
  parseLimit,
  parsePage,
  pagination,
  requireSessionUser,
  escapeRegex,
} from "@/app/api/_lib/phase12";

const POPULATE = [
  { path: "categoryId", select: "name slug isActive" },
  { path: "authorId", select: "name email" },
];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 12, 50);
    const search = String(searchParams.get("search") || "").trim();
    const categoryId = String(searchParams.get("categoryId") || "").trim();
    const status = String(searchParams.get("status") || "").trim();
    const isActiveRaw = searchParams.get("isActive");

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { excerpt: { $regex: escapeRegex(search), $options: "i" } },
        { slug: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = categoryId;
    }
    if (status === "draft" || status === "published") {
      filter.status = status;
    }
    if (isActiveRaw === "true") filter.isActive = true;
    else if (isActiveRaw === "false") filter.isActive = false;

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      BlogPost.find(filter)
        .populate(POPULATE)
        .sort({ updatedAt: -1 })
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
    console.error("GET /api/blog", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog posts" },
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
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const categoryId = String(body.categoryId || "").trim();
    const excerpt = String(body.excerpt || "").trim();
    const thumbnailUrl = String(body.thumbnailUrl || "").trim();
    const status =
      body.status === "published" ? "published" : ("draft" as const);
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
      );
    }
    if (!content || isEmptyHtml(content)) {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 },
      );
    }
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return NextResponse.json(
        { success: false, error: "Valid category is required" },
        { status: 400 },
      );
    }

    const category = await BlogCategory.findById(categoryId).lean();
    if (!category || category.isActive === false) {
      return NextResponse.json(
        { success: false, error: "Category not found or inactive" },
        { status: 400 },
      );
    }

    const requestedSlug = String(body.slug || "").trim();
    const baseSlug = toSlug(requestedSlug || title);
    if (!baseSlug) {
      return NextResponse.json(
        { success: false, error: "Invalid title/slug" },
        { status: 400 },
      );
    }
    const slug = await ensureUniqueBlogSlug(BlogPost, baseSlug);

    const created = await BlogPost.create({
      title,
      slug,
      excerpt,
      content,
      thumbnailUrl,
      categoryId,
      authorId: auth.user!.id,
      status,
      isActive,
      publishedAt: status === "published" ? new Date() : undefined,
    });

    const populated = await BlogPost.findById(created._id)
      .populate(POPULATE)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        post: mapBlogPost((populated || created.toObject()) as Record<string, unknown>),
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error && error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, error: "Invalid blog post payload" },
        { status: 400 },
      );
    }
    console.error("POST /api/blog", error);
    return NextResponse.json(
      { success: false, error: "Failed to create blog post" },
      { status: 500 },
    );
  }
}
