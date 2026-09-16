import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import BlogPost from "@/models/BlogPost";
import { mapBlogCategory } from "@/app/api/_lib/blog";

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    const rows = await BlogCategory.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    const categories = await Promise.all(
      rows.map(async (row) => {
        const postCount = await BlogPost.countDocuments({
          categoryId: row._id,
          status: "published",
          isActive: true,
        });
        return mapBlogCategory(row as Record<string, unknown>, postCount);
      }),
    );

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error("GET /api/public/blog-categories", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog categories" },
      { status: 500 },
    );
  }
}
