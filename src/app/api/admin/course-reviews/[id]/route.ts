import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import CourseReview from "@/models/CourseReview";
import {
  mapCourseReview,
  taughtCourseIds,
} from "@/app/api/_lib/reviews";
import { isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";

type RouteCtx = { params: Promise<{ id: string }> };

async function ensureModeratorAccess(
  userId: string,
  role: string,
  courseField: mongoose.Types.ObjectId,
): Promise<NextResponse | null> {
  if (isAdminAreaRole(role)) return null;
  if (role !== "instructor") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const ids = await taughtCourseIds(userId);
  const ok = ids.some((c) => c.equals(courseField));
  if (!ok) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PUT(request: NextRequest, context: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid review id" }, { status: 400 });
    }

    const review = await CourseReview.findById(toObjectId(id));
    if (!review) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    const courseRef = review.course as mongoose.Types.ObjectId;
    const denied = await ensureModeratorAccess(auth.user.id, auth.user.role, courseRef);
    if (denied) return denied;

    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.action === "string") {
      switch (body.action) {
        case "approve":
          review.isApproved = true;
          break;
        case "disapprove":
          review.isApproved = false;
          break;
        case "make_private":
          review.isPublic = false;
          break;
        case "make_public":
          review.isPublic = true;
          break;
        case "reset_reports":
          review.reportedCount = 0;
          break;
        case "reply": {
          const reply = String(body.reply || "").trim();
          if (!reply) {
            return NextResponse.json(
              { success: false, error: "Reply text is required" },
              { status: 400 },
            );
          }
          if (reply.length > 2000) {
            return NextResponse.json(
              { success: false, error: "Reply cannot exceed 2000 characters" },
              { status: 400 },
            );
          }
          review.instructorReply = reply;
          review.instructorRepliedAt = new Date();
          review.instructorRepliedBy = toObjectId(auth.user.id);
          break;
        }
        default:
          return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
      }
    } else {
      if (body.isDisplayed !== undefined) review.isDisplayed = Boolean(body.isDisplayed);
      if (body.displayOrder !== undefined) {
        const n = Number(body.displayOrder);
        if (Number.isFinite(n)) review.displayOrder = n;
      }
      if (body.isApproved !== undefined) review.isApproved = Boolean(body.isApproved);
      if (body.isPublic !== undefined) review.isPublic = Boolean(body.isPublic);
      if (body.displayStudentName !== undefined) {
        review.displayStudentName =
          typeof body.displayStudentName === "string" ? body.displayStudentName : undefined;
      }
      if (body.title !== undefined && typeof body.title === "string") review.title = body.title;
      if (body.comment !== undefined && typeof body.comment === "string") review.comment = body.comment;
      if (body.rating !== undefined) {
        const r = Number(body.rating);
        if (Number.isFinite(r) && r >= 1 && r <= 5) review.rating = r;
      }
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
    console.error("PUT /api/admin/course-reviews/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid review id" }, { status: 400 });
    }

    const review = await CourseReview.findById(toObjectId(id));
    if (!review) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    const courseRef = review.course as mongoose.Types.ObjectId;
    const denied = await ensureModeratorAccess(auth.user.id, auth.user.role, courseRef);
    if (denied) return denied;

    await review.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/course-reviews/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete review" }, { status: 500 });
  }
}
