import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import LessonQuizResult from "@/models/LessonQuizResult";
import { toObjectId } from "@/app/api/_lib/lessonQuiz";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
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
    const userOid = toObjectId(userId);
    if (!courseOid || !userOid) {
      return NextResponse.json(
        { success: false, error: "Invalid course or user ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const submitted = await LessonQuizResult.aggregate([
      {
        $match: {
          user: userOid,
          course: courseOid,
          isPracticeMode: { $ne: true },
        },
      },
      { $group: { _id: "$lesson" } },
    ]);

    const lessonIds = submitted.map((item) => String(item._id));

    return NextResponse.json({
      success: true,
      data: { lessonIds },
    });
  } catch (error) {
    console.error("Quiz completion status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch quiz completion status" },
      { status: 500 },
    );
  }
}
