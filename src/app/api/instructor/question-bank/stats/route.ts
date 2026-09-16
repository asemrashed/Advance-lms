import { NextRequest, NextResponse } from "next/server";
import { statsQuestionBank } from "@/app/api/_lib/questionBank";
import { requireSessionUser } from "@/app/api/_lib/phase12";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["instructor"]);
    if (auth.error) return auth.error;

    const stats = await statsQuestionBank(auth.user, new URL(request.url).searchParams);

    return NextResponse.json({ success: true, data: { stats } });
  } catch (error) {
    console.error("Instructor question-bank stats GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
