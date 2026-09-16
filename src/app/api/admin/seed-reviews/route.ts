import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";

/**
 * Dev convenience endpoint referenced by `AdminReviewsClient`.
 * Full bulk seeding is intentionally not implemented; returns a no-op envelope so the UI does not hit the catch-all mock.
 */
export async function POST() {
  try {
    const auth = await requireSessionUser(["super_admin"]);
    if (auth.error) return auth.error;

    return NextResponse.json({
      success: true,
      message: "Review seeding is disabled; create reviews via student flow or admin website-content.",
      data: {
        reviewsCreated: 0,
        enrollmentsCreated: 0,
        reviewsSkipped: 0,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/seed-reviews error:", error);
    return NextResponse.json({ success: false, error: "Failed to seed reviews" }, { status: 500 });
  }
}
