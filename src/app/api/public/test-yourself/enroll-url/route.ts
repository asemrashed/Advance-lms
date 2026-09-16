import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { resolveTestYourselfEnrollUrl } from "@/app/api/_lib/testYourselfTests";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject")?.trim() ?? "";
    const courseId = searchParams.get("courseId")?.trim();

    const url = await resolveTestYourselfEnrollUrl(subject, courseId);

    return NextResponse.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    console.error("Test-yourself enroll URL error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
