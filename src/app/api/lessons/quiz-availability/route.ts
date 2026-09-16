import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Question from "@/models/Question";
import { toObjectId } from "@/app/api/_lib/lessonQuiz";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const course = new URL(request.url).searchParams.get("course");
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course is required" },
        { status: 400 },
      );
    }

    const courseOid = toObjectId(course);
    if (!courseOid) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const quizCounts = await Question.aggregate([
      {
        $lookup: {
          from: "lessons",
          localField: "lesson",
          foreignField: "_id",
          as: "lessonDoc",
        },
      },
      { $unwind: "$lessonDoc" },
      {
        $match: {
          "lessonDoc.course": courseOid,
          isActive: true,
          lesson: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$lesson",
          count: { $sum: 1 },
        },
      },
    ]);

    const countsByLesson: Record<string, number> = {};
    for (const item of quizCounts) {
      countsByLesson[String(item._id)] = Number(item.count) || 0;
    }

    return NextResponse.json({
      success: true,
      data: { countsByLesson },
    });
  } catch (error) {
    console.error("Lesson quiz availability error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch lesson quiz availability" },
      { status: 500 },
    );
  }
}
