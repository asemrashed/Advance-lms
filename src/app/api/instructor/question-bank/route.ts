import { NextRequest, NextResponse } from "next/server";
import { listQuestionBank } from "@/app/api/_lib/questionBank";
import { requireSessionUser } from "@/app/api/_lib/phase12";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["instructor"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { questions, pagination, topics } = await listQuestionBank(auth.user, searchParams);

    return NextResponse.json({
      success: true,
      data: { questions, pagination, topics },
    });
  } catch (error) {
    console.error("Instructor question-bank GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch question bank" }, { status: 500 });
  }
}
