import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import CourseFAQ from "@/models/CourseFAQ";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { assertCanManageCourseFaqs } from "@/app/api/admin/faqs/_access";

export async function POST(request: NextRequest) {
  const auth = await requireSessionUser(["admin", "instructor"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { course, faqs: faqList } = body as {
      course?: string;
      faqs?: Array<{ question?: string; answer?: string }>;
    };

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course is required" },
        { status: 400 },
      );
    }

    const denied = await assertCanManageCourseFaqs(auth.user, course);
    if (denied) return denied;

    if (!Array.isArray(faqList) || faqList.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one FAQ (question and answer) is required" },
        { status: 400 },
      );
    }

    const validPairs = faqList
      .map((item) => ({
        question: typeof item.question === "string" ? item.question.trim() : "",
        answer: typeof item.answer === "string" ? item.answer.trim() : "",
      }))
      .filter((item) => item.question && item.answer);

    if (validPairs.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one FAQ must have both question and answer" },
        { status: 400 },
      );
    }

    const maxOrder = await CourseFAQ.findOne({ course })
      .sort({ order: -1 })
      .select("order")
      .lean();
    let nextOrder = typeof maxOrder?.order === "number" ? maxOrder.order + 1 : 0;

    const created = await CourseFAQ.insertMany(
      validPairs.map((pair) => ({
        course,
        question: pair.question,
        answer: pair.answer,
        order: nextOrder++,
      })),
    );

    const ids = created.map((c) => c._id as Types.ObjectId);
    const populated = await CourseFAQ.find({ _id: { $in: ids } })
      .populate("course", "title")
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: { faqs: populated },
      message: `${created.length} FAQ(s) created successfully`,
    });
  } catch (error) {
    console.error("[admin/faqs/bulk] POST", error);
    return NextResponse.json(
      { success: false, error: "Failed to create FAQs" },
      { status: 500 },
    );
  }
}
