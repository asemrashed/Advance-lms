import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { getPlatformQuestionTestYourselfSummary } from "@/app/api/_lib/platformQuestions";

export async function GET() {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const summary = await getPlatformQuestionTestYourselfSummary(auth.user);

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error("Platform questions test-yourself summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Test Yourself summary" },
      { status: 500 },
    );
  }
}
