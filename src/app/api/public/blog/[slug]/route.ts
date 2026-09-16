import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";
import { mapBlogPost } from "@/app/api/_lib/blog";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const POPULATE = [
  { path: "categoryId", select: "name slug isActive" },
  { path: "authorId", select: "name email" },
];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { slug } = await params;
    const normalized = String(slug || "")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: "Slug is required" },
        { status: 400 },
      );
    }

    const post = await BlogPost.findOne({
      slug: normalized,
      status: "published",
      isActive: true,
    })
      .populate(POPULATE)
      .lean();

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Blog post not found" },
        { status: 404 },
      );
    }

    const related = await BlogPost.find({
      _id: { $ne: post._id },
      categoryId: post.categoryId,
      status: "published",
      isActive: true,
    })
      .populate(POPULATE)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(4)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        post: mapBlogPost(post as Record<string, unknown>),
        related: related.map((row) =>
          mapBlogPost(row as Record<string, unknown>),
        ),
      },
    });
  } catch (error) {
    console.error("GET /api/public/blog/[slug]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blog post" },
      { status: 500 },
    );
  }
}
