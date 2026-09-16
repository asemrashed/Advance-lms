import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { computeDuePayments } from "@/app/api/_lib/duePayments";

export async function GET() {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;

    const data = await computeDuePayments(auth.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/student/payments/due", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch due payments" },
      { status: 500 },
    );
  }
}
