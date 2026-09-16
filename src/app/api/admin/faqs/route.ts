import { NextRequest, NextResponse } from "next/server";
import CourseFAQ from "@/models/CourseFAQ";
import {
  requireSessionUser,
  parsePage,
  parseLimit,
  pagination,
} from "@/app/api/_lib/phase12";
import { assertCanManageCourseFaqs } from "@/app/api/admin/faqs/_access";
import { instructorAccessibleCourseIds } from "@/app/api/_lib/instructorCourses";

export async function GET(request: NextRequest) {
  const auth = await requireSessionUser(["admin", "instructor"]);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course") || "";
    const page = parsePage(searchParams, 1);
    const limit = parseLimit(searchParams, 50, 100);

    const filter: Record<string, unknown> = {};
    if (courseId) {
      const denied = await assertCanManageCourseFaqs(auth.user, courseId);
      if (denied) return denied;
      filter.course = courseId;
    } else if (auth.user.role === "instructor") {
      const courseIds = await instructorAccessibleCourseIds(auth.user.id);
      filter.course = { $in: courseIds };
    }

    const skip = (page - 1) * limit;
    const [faqs, total] = await Promise.all([
      CourseFAQ.find(filter)
        .populate("course", "title")
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseFAQ.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        faqs,
        pagination: pagination(page, limit, total),
      },
    });
  } catch (error) {
    console.error("[admin/faqs] GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch FAQs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionUser(["admin", "instructor"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { course, question, answer, order } = body as {
      course?: string;
      question?: string;
      answer?: string;
      order?: number;
    };

    if (!course || !question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { success: false, error: "Course, question, and answer are required" },
        { status: 400 },
      );
    }

    const denied = await assertCanManageCourseFaqs(auth.user, course);
    if (denied) return denied;

    const maxOrder = await CourseFAQ.findOne({ course })
      .sort({ order: -1 })
      .select("order")
      .lean();
    const nextOrder =
      typeof order === "number" && order >= 0 ? order : (maxOrder?.order ?? 0) + 1;

    const faq = await CourseFAQ.create({
      course,
      question: question.trim(),
      answer: answer.trim(),
      order: nextOrder,
    });

    const populated = await CourseFAQ.findById(faq._id).populate("course", "title").lean();

    return NextResponse.json({
      success: true,
      data: populated,
      message: "FAQ created successfully",
    });
  } catch (error) {
    console.error("[admin/faqs] POST", error);
    return NextResponse.json(
      { success: false, error: "Failed to create FAQ" },
      { status: 500 },
    );
  }
}
