import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Category from "@/models/Category";
import Course from "@/models/Course";
import { isAdminAreaRole } from "@/lib/roles";

interface RouteParams {
  params: Promise<{ id: string }>;
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireAdminSession();
    if (authError) {
      return authError;
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const existing = await Category.findById(id).lean();
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

      const duplicate = await Category.findOne({
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

    const updated = await Category.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    const count = await Course.countDocuments({
      $or: [
        { category: String(updated?.slug || "") },
        { category: String(updated?._id || id) },
        { category: String(updated?.name || "") },
      ],
    });

    return NextResponse.json({
      success: true,
      data: mapCategory(updated, count),
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
    console.error("Category update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireAdminSession();
    if (authError) {
      return authError;
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const existing = await Category.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    const linkedCourses = await Course.countDocuments({
      $or: [
        { category: String(existing.slug || "") },
        { category: String(existing._id) },
        { category: String(existing.name || "") },
      ],
    });
    if (linkedCourses > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete category with existing courses",
        },
        { status: 409 },
      );
    }

    await Category.findByIdAndDelete(id);
    return NextResponse.json({ success: true, data: { _id: id } });
  } catch (error) {
    console.error("Category delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
