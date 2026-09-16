import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { getPastPaperStats } from "@/app/api/_lib/platformQuestions";

export async function GET() {
  try {
    await connectDB();
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const data = await getPastPaperStats(auth.user);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Past-paper stats GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch past-paper stats" },
      { status: 500 },
    );
  }
}
