import connectDB from "@/lib/mongodb";
import CourseReview from "@/models/CourseReview";
import { mapCourseReview } from "@/app/api/_lib/reviews";
import type { CourseReview as CourseReviewDto } from "@/types/course-review";

/** Homepage carousel: admin-promoted reviews (isDisplayed), rating ≥ 4. */
export async function getFeaturedReviews(): Promise<CourseReviewDto[]> {
  await connectDB();
  const rows = await CourseReview.find({
    isDisplayed: true,
    isApproved: true,
    isPublic: true,
    rating: { $gte: 4 },
    comment: { $exists: true, $nin: [null, ""] },
  })
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(8)
    .populate("student", "name avatar")
    .populate("course", "title")
    .lean();

  return rows.map((row) =>
    mapCourseReview(row as Record<string, unknown>),
  ) as CourseReviewDto[];
}
