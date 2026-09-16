import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import Course from "@/models/Course";
import {
  coursePricingFromLean,
} from "@/lib/courses/liveCoursePricing";
import { normalizeBillingPlan } from "@/lib/subscription/plan";
import { getStudentCoursePricingState } from "@/lib/courses/studentPricing";

type RouteContext = { params: Promise<{ courseId: string }> };

/** GET /api/me/course-pricing/[courseId]?billingPlan=monthly|full */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { courseId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const billingPlan = normalizeBillingPlan(
      request.nextUrl.searchParams.get("billingPlan"),
    );

    const course = await Course.findOne({
      _id: courseId,
      status: "published",
      isHidden: { $ne: true },
    })
      .select("isPaid price salePrice monthlyPrice")
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    const pricing = coursePricingFromLean(course);
    const state = await getStudentCoursePricingState(
      auth.user.id,
      courseId,
      billingPlan,
      pricing,
    );

    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    console.error("GET /api/me/course-pricing/[courseId]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch course pricing" },
      { status: 500 },
    );
  }
}
