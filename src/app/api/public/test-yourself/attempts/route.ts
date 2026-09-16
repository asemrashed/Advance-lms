import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { listTestYourselfAttemptsForUser } from "@/app/api/_lib/testYourself";

/** GET /api/public/test-yourself/attempts — logged-in user's attempt history. */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limitRaw = Number.parseInt(searchParams.get("limit") || "50", 10);
    const attempts = await listTestYourselfAttemptsForUser(
      session.user.id,
      Number.isFinite(limitRaw) ? limitRaw : 50,
    );

    return NextResponse.json({
      success: true,
      data: { attempts },
    });
  } catch (error) {
    console.error("Test-yourself attempts error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
