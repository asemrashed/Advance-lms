import { NextRequest, NextResponse } from "next/server";
import CourseReview from "@/models/CourseReview";
import User from "@/models/User";
import Course from "@/models/Course";
import {
  buildPagination,
  mapCourseReview,
  parseReviewListQuery,
  taughtCourseIds,
} from "@/app/api/_lib/reviews";
import {
  isObjectId,
  parseLimit,
  parsePage,
  requireSessionUser,
  toObjectId,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import { imageUrlError } from "@/lib/imageUrl";

function buildModerationFilter(
  searchParams: URLSearchParams,
  instructorCourseIds?: import("mongoose").Types.ObjectId[],
) {
  const filter: Record<string, unknown> = {};

  const course = searchParams.get("course")?.trim();
  if (course && course !== "all" && isObjectId(course)) {
    filter.course = toObjectId(course);
  } else if (instructorCourseIds?.length) {
    filter.course = { $in: instructorCourseIds };
  }

  const student = searchParams.get("student")?.trim();
  if (student && student !== "all" && isObjectId(student)) {
    filter.student = toObjectId(student);
  }

  const search = (searchParams.get("search") || "").trim();
  if (search) {
    filter.$or = [
      { title: { $regex: escapeRegex(search), $options: "i" } },
      { comment: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }

  const rating = searchParams.get("rating");
  if (rating && rating !== "all") {
    const n = Number(rating);
    if (Number.isFinite(n)) filter.rating = n;
  }

  const isApproved = searchParams.get("isApproved");
  if (isApproved === "true" || isApproved === "false") {
    filter.isApproved = isApproved === "true";
  }

  const isPublic = searchParams.get("isPublic");
  if (isPublic === "true" || isPublic === "false") {
    filter.isPublic = isPublic === "true";
  }

  const reported = searchParams.get("reportedCount");
  if (reported && reported !== "all") {
    const n = Number(reported);
    if (Number.isFinite(n)) {
      filter.reportedCount = { $gte: n };
    }
  }

  return filter;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 500, 5000);
    const skip = (page - 1) * limit;
    const { sort } = parseReviewListQuery(searchParams);

    let instructorCourses: Awaited<ReturnType<typeof taughtCourseIds>> | undefined;
    if (auth.user.role === "instructor") {
      instructorCourses = await taughtCourseIds(auth.user.id);
      if (!instructorCourses.length) {
        return NextResponse.json({
          success: true,
          data: {
            reviews: [],
            pagination: buildPagination(page, limit, 0),
          },
        });
      }

      const courseParam = searchParams.get("course")?.trim();
      if (courseParam && courseParam !== "all" && isObjectId(courseParam)) {
        const cid = toObjectId(courseParam);
        const allowed = instructorCourses.some((id) => id.equals(cid));
        if (!allowed) {
          return NextResponse.json({
            success: true,
            data: {
              reviews: [],
              pagination: buildPagination(page, limit, 0),
            },
          });
        }
      }
    }

    const filter = buildModerationFilter(searchParams, instructorCourses);

    const [rows, total] = await Promise.all([
      CourseReview.find(filter)
        .populate("student", "name avatar role isBlockedFromReviews")
        .populate("course", "title thumbnailUrl")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseReview.countDocuments(filter),
    ]);

    const reviews = rows.map((r) => mapCourseReview(r as Record<string, unknown>));
    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: buildPagination(page, limit, total),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/course-reviews error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const courseRaw = body.course;
    const rating = Number(body.rating);

    if (typeof courseRaw !== "string" || !isObjectId(courseRaw)) {
      return NextResponse.json({ success: false, error: "Valid course is required" }, { status: 400 });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const reviewType = body.reviewType === "video" ? "video" : "text";
    const comment = typeof body.comment === "string" ? body.comment : "";
    const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : "";
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
      typeof body.videoThumbnail === "string" ? body.videoThumbnail.trim() : "";
    const thumbnailError = imageUrlError(videoThumbnail);
    if (thumbnailError) {
      return NextResponse.json(
        { success: false, error: thumbnailError },
        { status: 400 },
      );
    }

    const studentRaw =
      typeof body.student === "string" && isObjectId(body.student) ? body.student : auth.user.id;

    const studentUser = await User.findById(toObjectId(studentRaw)).select("_id").lean();
    if (!studentUser) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 400 });
    }

    const courseDoc = await Course.findById(toObjectId(courseRaw)).select("_id").lean();
    if (!courseDoc) {
      return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 });
    }

    try {
      const created = await CourseReview.create({
        student: toObjectId(studentRaw),
        course: toObjectId(courseRaw),
        rating,
        reviewType,
        title: typeof body.title === "string" ? body.title : undefined,
        comment: comment || undefined,
        videoUrl: videoUrl || undefined,
        videoThumbnail: videoThumbnail || undefined,
        isVerified: Boolean(body.isVerified),
        isPublic: body.isPublic !== false,
        helpfulVotes: 0,
        helpfulVoters: [],
        reportedCount: 0,
        isApproved: body.isApproved !== false,
        isDisplayed: body.isDisplayed !== undefined ? Boolean(body.isDisplayed) : true,
        displayOrder: Number(body.displayOrder) || 0,
        displayStudentName:
          typeof body.displayStudentName === "string" ? body.displayStudentName : undefined,
      });

      const populated = await CourseReview.findById(created._id)
        .populate("student", "name avatar role isBlockedFromReviews")
        .populate("course", "title thumbnailUrl")
        .lean();

      return NextResponse.json({
        success: true,
        data: mapCourseReview(populated as Record<string, unknown>),
      });
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code?: number }).code === 11000) {
        return NextResponse.json(
          {
            success: false,
            error: "A review for this student and course already exists",
          },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("POST /api/admin/course-reviews error:", error);
    return NextResponse.json({ success: false, error: "Failed to create review" }, { status: 500 });
  }
}
