import { NextRequest, NextResponse } from "next/server";
import { buildPublicCourseReviewsPayload } from "@/app/api/_lib/reviews";
import { isObjectId } from "@/app/api/_lib/phase12";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * Public read: aggregates stats + paginated reviews for a course.
 * Connects the previously disconnected `/api/courses/[id]/reviews` path used by `useCourseReviews`.
 */
export async function GET(request: NextRequest, context: RouteCtx) {
  try {
    const { id: courseId } = await context.params;
    if (!isObjectId(courseId)) {
      return NextResponse.json({ success: false, error: "Invalid course id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const result = await buildPublicCourseReviewsPayload(courseId, searchParams);
    if ("error" in result && result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.body);
  } catch (error) {
    console.error("GET /api/courses/[id]/reviews error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch reviews" }, { status: 500 });
  }
}
