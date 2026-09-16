import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getDisplayName } from "@/lib/displayName";
import CourseReview from "@/models/CourseReview";
import Course from "@/models/Course";
import {
  pagination as pagHelper,
  parseLimit,
  parsePage,
  toObjectId,
  escapeRegex,
} from "@/app/api/_lib/phase12";

export type RatingDistribution = { 1: number; 2: number; 3: number; 4: number; 5: number };

export function emptyRatingDistribution(): RatingDistribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export async function taughtCourseIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const oid = toObjectId(userId);
  return Course.find({
    $or: [{ instructor: oid }, { createdBy: oid }],
  })
    .distinct("_id")
    .then((ids) => ids as mongoose.Types.ObjectId[]);
}

/** Approved + visible on marketing / course detail surfaces */
export function publicCatalogReviewMatch(courseId: mongoose.Types.ObjectId) {
  return {
    course: courseId,
    isApproved: true,
    isPublic: true,
    isDisplayed: true,
  };
}

export function mapCourseReview(row: Record<string, unknown>) {
  const student = row.student as Record<string, unknown> | undefined;
  const course = row.course as Record<string, unknown> | undefined;

  const studentOut =
    student && typeof student === "object" && student._id
      ? {
          _id: String(student._id),
          name: getDisplayName(student),
          avatar: typeof student.avatar === "string" ? student.avatar : "",
          role: student.role as string | undefined,
          isBlockedFromReviews: Boolean(student.isBlockedFromReviews),
        }
      : {
          _id: String(row.student ?? ""),
          name: "",
        };

  const courseOut =
    course && typeof course === "object" && course._id
      ? {
          _id: String(course._id),
          title: String(course.title ?? ""),
          thumbnailUrl:
            typeof course.thumbnailUrl === "string" ? course.thumbnailUrl : undefined,
        }
      : String(row.course ?? "");

  return {
    _id: String(row._id),
    student: studentOut,
    course: courseOut,
    rating: Number(row.rating),
    reviewType: (row.reviewType as string) || "text",
    title: row.title ? String(row.title) : undefined,
    comment: row.comment ? String(row.comment) : undefined,
    videoUrl: row.videoUrl ? String(row.videoUrl) : undefined,
    videoThumbnail: row.videoThumbnail ? String(row.videoThumbnail) : undefined,
    isVerified: Boolean(row.isVerified),
    isPublic: row.isPublic !== false,
    helpfulVotes: Number(row.helpfulVotes ?? 0),
    reportedCount: Number(row.reportedCount ?? 0),
    isApproved: Boolean(row.isApproved),
    isDisplayed: row.isDisplayed !== false,
    displayOrder: Number(row.displayOrder ?? 0),
    displayStudentName: row.displayStudentName ? String(row.displayStudentName) : undefined,
    instructorReply: row.instructorReply ? String(row.instructorReply) : undefined,
    instructorRepliedAt:
      row.instructorRepliedAt instanceof Date
        ? row.instructorRepliedAt.toISOString()
        : row.instructorRepliedAt
          ? String(row.instructorRepliedAt)
          : undefined,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt ?? ""),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt ?? ""),
  };
}

export function distributionFromReviews(
  reviews: Array<{ rating?: number }>,
): RatingDistribution {
  const d = emptyRatingDistribution();
  for (const r of reviews) {
    const n = Number(r.rating);
    if (n >= 1 && n <= 5) {
      d[n as keyof RatingDistribution]++;
    }
  }
  return d;
}

export async function aggregateRatingStats(courseId: mongoose.Types.ObjectId): Promise<{
  totalReviews: number;
  averageRating: number;
  ratingDistribution: RatingDistribution;
}> {
  const match = publicCatalogReviewMatch(courseId);
  const rows = await CourseReview.find(match).select("rating").lean();
  const totalReviews = rows.length;
  if (totalReviews === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: emptyRatingDistribution(),
    };
  }
  const sum = rows.reduce((acc, r) => acc + Number(r.rating || 0), 0);
  return {
    totalReviews,
    averageRating: Math.round((sum / totalReviews) * 10) / 10,
    ratingDistribution: distributionFromReviews(rows),
  };
}

const REVIEW_SORT_FIELDS = new Set([
  "createdAt",
  "rating",
  "helpfulVotes",
  "displayOrder",
]);

export function parseReviewListQuery(searchParams: URLSearchParams) {
  const page = parsePage(searchParams);
  const limit = parseLimit(searchParams, 10, 200);
  const skip = (page - 1) * limit;
  const sortByRaw = (searchParams.get("sortBy") || "createdAt").trim();
  const sortBy = REVIEW_SORT_FIELDS.has(sortByRaw) ? sortByRaw : "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };
  return { page, limit, skip, sort };
}

export function applyReviewListFilters(
  filter: Record<string, unknown>,
  searchParams: URLSearchParams,
) {
  const isDisplayed = searchParams.get("isDisplayed");
  if (isDisplayed === "true" || isDisplayed === "false") {
    filter.isDisplayed = isDisplayed === "true";
  }

  const ratingMin = searchParams.get("ratingMin");
  if (ratingMin) {
    const n = Number(ratingMin);
    if (Number.isFinite(n)) {
      filter.rating = { $gte: n };
    }
  } else {
    const rating = searchParams.get("rating");
    if (rating && rating !== "all") {
      const n = Number(rating);
      if (Number.isFinite(n)) filter.rating = n;
    }
  }
}

export function buildPagination(page: number, limit: number, total: number) {
  return pagHelper(page, limit, total);
}

/** Public catalog / course-detail listing (approved + public + displayed). */
export async function buildPublicCourseReviewsPayload(
  courseRaw: string,
  searchParams: URLSearchParams,
) {
  if (!mongoose.Types.ObjectId.isValid(courseRaw)) {
    return { error: "Valid course id is required" as const, status: 400 as const };
  }

  await connectDB();
  const courseOid = toObjectId(courseRaw);
  const { page, limit, skip, sort } = parseReviewListQuery(searchParams);

  const filter: Record<string, unknown> = {
    ...publicCatalogReviewMatch(courseOid),
  };

  const search = (searchParams.get("search") || "").trim();
  if (search) {
    const safe = escapeRegex(search);
    filter.$or = [
      { title: { $regex: safe, $options: "i" } },
      { comment: { $regex: safe, $options: "i" } },
    ];
  }

  const rating = searchParams.get("rating");
  if (rating && rating !== "all") {
    const n = Number(rating);
    if (Number.isFinite(n)) filter.rating = n;
  }

  const [rows, total, stats] = await Promise.all([
    CourseReview.find(filter)
      .populate("student", "name avatar role isBlockedFromReviews")
      .populate("course", "title thumbnailUrl")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    CourseReview.countDocuments(filter),
    aggregateRatingStats(courseOid),
  ]);

  const reviews = rows.map((r) => mapCourseReview(r as Record<string, unknown>));
  return {
    body: {
      success: true,
      data: {
        reviews,
        stats,
        pagination: buildPagination(page, limit, total),
      },
    },
    status: 200 as const,
  };
}
