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
import { requireSessionUser } from "@/app/api/_lib/phase12";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const POPULATE = [
  { path: "categoryId", select: "name slug isActive" },
  { path: "authorId", select: "name email" },
];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid post ID" },
        { status: 400 },
      );
    }

    const post = await BlogPost.findById(id).populate(POPULATE).lean();
    if (!post) {
      return NextResponse.json(
        { success: false, error: "Blog post not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { post: mapBlogPost(post as Record<string, unknown>) },
    });
  } catch (error) {
    console.error("GET /api/blog/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog post" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid post ID" },
        { status: 400 },
      );
    }

    const existing = await BlogPost.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Blog post not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json(
          { success: false, error: "Title cannot be empty" },
          { status: 400 },
        );
      }
      updateData.title = title;
    }

    if (typeof body.excerpt === "string") {
      updateData.excerpt = body.excerpt.trim();
    }

    if (typeof body.content === "string") {
      if (isEmptyHtml(body.content)) {
        return NextResponse.json(
          { success: false, error: "Content cannot be empty" },
          { status: 400 },
        );
      }
      updateData.content = body.content;
    }

    if (typeof body.thumbnailUrl === "string") {
      updateData.thumbnailUrl = body.thumbnailUrl.trim();
    }

    if (typeof body.categoryId === "string") {
      const categoryId = body.categoryId.trim();
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return NextResponse.json(
          { success: false, error: "Invalid category" },
          { status: 400 },
        );
      }
      const category = await BlogCategory.findById(categoryId).lean();
      if (!category) {
        return NextResponse.json(
          { success: false, error: "Category not found" },
          { status: 400 },
        );
      }
      updateData.categoryId = categoryId;
    }

    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    if (body.status === "draft" || body.status === "published") {
      updateData.status = body.status;
      if (body.status === "published" && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const slugSource =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim()
        : typeof updateData.title === "string"
          ? String(updateData.title)
          : null;
    if (slugSource) {
      const baseSlug = toSlug(slugSource);
      if (!baseSlug) {
        return NextResponse.json(
          { success: false, error: "Invalid slug" },
          { status: 400 },
        );
      }
      updateData.slug = await ensureUniqueBlogSlug(BlogPost, baseSlug, id);
    }

    Object.assign(existing, updateData);
    await existing.save();

    const populated = await BlogPost.findById(id).populate(POPULATE).lean();

    return NextResponse.json({
      success: true,
      data: {
        post: mapBlogPost(
          (populated || existing.toObject()) as Record<string, unknown>,
        ),
      },
    });
  } catch (error) {
    console.error("PUT /api/blog/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update blog post" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid post ID" },
        { status: 400 },
      );
    }

    const existing = await BlogPost.findById(id).select("_id").lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Blog post not found" },
        { status: 404 },
      );
    }

    await BlogPost.findByIdAndDelete(id);
    return NextResponse.json({ success: true, data: { _id: id } });
  } catch (error) {
    console.error("DELETE /api/blog/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete blog post" },
      { status: 500 },
    );
  }
}
