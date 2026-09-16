import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import BlogPost from "@/models/BlogPost";
import { mapBlogCategory, toSlug } from "@/app/api/_lib/blog";
import { requireSessionUser } from "@/app/api/_lib/phase12";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const existing = await BlogCategory.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, error: "Category name cannot be empty" },
          { status: 400 },
        );
      }
      const nextSlug = toSlug(trimmed);
      if (!nextSlug) {
        return NextResponse.json(
          { success: false, error: "Invalid category name" },
          { status: 400 },
        );
      }
      const duplicate = await BlogCategory.findOne({
        _id: { $ne: id },
        slug: nextSlug,
      })
        .select("_id")
        .lean();
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Category with this name already exists" },
          { status: 409 },
        );
      }
      updateData.name = trimmed;
      updateData.slug = nextSlug;
    }

    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    const updated = await BlogCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    const postCount = await BlogPost.countDocuments({ categoryId: id });

    return NextResponse.json({
      success: true,
      data: mapBlogCategory(
        (updated || existing) as Record<string, unknown>,
        postCount,
      ),
    });
  } catch (error) {
    console.error("PUT /api/blog-categories/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update blog category" },
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
        { success: false, error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const existing = await BlogCategory.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    const linked = await BlogPost.countDocuments({ categoryId: id });
    if (linked > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete category with existing blog posts",
        },
        { status: 409 },
      );
    }

    await BlogCategory.findByIdAndDelete(id);
    return NextResponse.json({ success: true, data: { _id: id } });
  } catch (error) {
    console.error("DELETE /api/blog-categories/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete blog category" },
      { status: 500 },
    );
  }
}
