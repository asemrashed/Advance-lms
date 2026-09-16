import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseFAQ from "@/models/CourseFAQ";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") || searchParams.get("course");

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Valid course ID is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const course = await Course.findOne({
      _id: courseId,
      status: "published",
      isHidden: { $ne: true },
    })
      .select("_id")
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found or not published" },
        { status: 404 },
      );
    }

    const faqs = await CourseFAQ.find({ course: courseId })
      .sort({ order: 1, createdAt: 1 })
      .select("question answer order")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        faqs: faqs.map((faq: any) => ({
          _id: String(faq._id),
          question: faq.question,
          answer: faq.answer,
          order: typeof faq.order === "number" ? faq.order : 0,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching public faqs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch FAQs" },
      { status: 500 },
    );
  }
}
