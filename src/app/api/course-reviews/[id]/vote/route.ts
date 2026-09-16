import { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import CourseReview from "@/models/CourseReview";
import { mapCourseReview } from "@/app/api/_lib/reviews";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteCtx) {
  try {
    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid review id" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as { isHelpful?: boolean };
    const isHelpful = Boolean(body.isHelpful);

    await connectDB();
    const review = await CourseReview.findById(toObjectId(id));
    if (!review) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    const voter = toObjectId(session.user.id);
    const already = review.helpfulVoters.some((v: Types.ObjectId) => v.equals(voter));

    if (isHelpful) {
      if (!already) {
        review.helpfulVoters.push(voter);
        review.helpfulVotes = Math.max(0, review.helpfulVotes + 1);
      }
    } else if (already) {
      review.helpfulVoters = review.helpfulVoters.filter(
        (v: Types.ObjectId) => !v.equals(voter),
      );
      review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
    }

    await review.save();

    const populated = await CourseReview.findById(review._id)
      .populate("student", "name avatar role isBlockedFromReviews")
      .populate("course", "title thumbnailUrl")
      .lean();

    return NextResponse.json({
      success: true,
      data: mapCourseReview(populated as Record<string, unknown>),
    });
  } catch (error) {
    console.error("POST vote error:", error);
    return NextResponse.json({ success: false, error: "Failed to record vote" }, { status: 500 });
  }
}
