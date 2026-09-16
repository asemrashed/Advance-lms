import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { getCurriculumOptionsForSubject } from "@/app/api/_lib/platformQuestionCurriculum";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const subject = new URL(request.url).searchParams.get("subject")?.trim() ?? "";
    if (!subject) {
      return NextResponse.json(
        { success: false, error: "subject query parameter is required" },
        { status: 400 },
      );
    }

    const modules = await getCurriculumOptionsForSubject(auth.user, subject);

    return NextResponse.json({ success: true, data: { modules } });
  } catch (error) {
    console.error("Platform curriculum-options error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load curriculum options" },
      { status: 500 },
    );
  }
}
