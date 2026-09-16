import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import CourseReview from "@/models/CourseReview";
import User from "@/models/User";
import { mapCourseReview } from "@/app/api/_lib/reviews";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";
import { imageUrlError } from "@/lib/imageUrl";
import { isAdminAreaRole } from "@/lib/roles";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteCtx) {
  try {
    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid review id" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    await connectDB();
    const row = await CourseReview.findById(toObjectId(id))
      .populate("student", "name avatar role isBlockedFromReviews")
      .populate("course", "title thumbnailUrl")
      .lean();

    if (!row) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    const owner = String(row.student) === session.user.id;
    if (!owner && !isAdminAreaRole(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: mapCourseReview(row as Record<string, unknown>),
    });
  } catch (error) {
    console.error("GET /api/course-reviews/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to load review" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteCtx) {
  try {
    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid review id" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    await connectDB();
    const existing = await CourseReview.findById(toObjectId(id));
    if (!existing) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    const owner = existing.student.equals(toObjectId(session.user.id));
    if (!owner || session.user.role !== "student") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const rating = body.rating !== undefined ? Number(body.rating) : existing.rating;
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const reviewType = body.reviewType === "video" ? "video" : body.reviewType === "text" ? "text" : existing.reviewType;

    const comment =
      body.comment !== undefined && typeof body.comment === "string"
        ? body.comment
        : existing.comment || "";
    const videoUrl =
      body.videoUrl !== undefined && typeof body.videoUrl === "string"
        ? body.videoUrl
        : existing.videoUrl || "";

    if (reviewType === "text" && !comment.trim()) {
      return NextResponse.json({ success: false, error: "Comment is required for text reviews" }, { status: 400 });
    }
    if (reviewType === "video" && !videoUrl.trim()) {
      return NextResponse.json(
        { success: false, error: "Video URL is required for video reviews" },
        { status: 400 },
      );
    }

    const videoThumbnail =
      typeof body.videoThumbnail === "string"
        ? body.videoThumbnail.trim()
        : existing.videoThumbnail || "";
    const thumbnailError = imageUrlError(videoThumbnail);
    if (thumbnailError) {
      return NextResponse.json(
        { success: false, error: thumbnailError },
        { status: 400 },
      );
    }

    const user = await User.findById(session.user.id).select("isBlockedFromReviews").lean();
    if (user && (user as { isBlockedFromReviews?: boolean }).isBlockedFromReviews) {
      return NextResponse.json(
        { success: false, error: "You are blocked from editing reviews" },
        { status: 403 },
      );
    }

    existing.rating = rating;
    existing.reviewType = reviewType;
    existing.title = typeof body.title === "string" ? body.title : existing.title;
    existing.comment = comment || undefined;
    existing.videoUrl = videoUrl || undefined;
    existing.videoThumbnail = videoThumbnail || undefined;
    existing.isApproved = false;
    await existing.save();

    const populated = await CourseReview.findById(existing._id)
      .populate("student", "name avatar role isBlockedFromReviews")
      .populate("course", "title thumbnailUrl")
      .lean();

    return NextResponse.json({
      success: true,
      data: mapCourseReview(populated as Record<string, unknown>),
    });
  } catch (error) {
    console.error("PUT /api/course-reviews/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteCtx) {
  try {
    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid review id" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    await connectDB();
    const existing = await CourseReview.findById(toObjectId(id));
    if (!existing) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    const owner = existing.student.equals(toObjectId(session.user.id));
    if (!owner || session.user.role !== "student") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await existing.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/course-reviews/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete review" }, { status: 500 });
  }
}
