import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { resolveResourceCenterAccess } from "@/app/api/_lib/resourceAccess";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    const access = await resolveResourceCenterAccess(
      session?.user?.id,
      session?.user?.role,
    );

    return NextResponse.json({
      success: true,
      data: { access },
    });
  } catch (error) {
    console.error("Public resources access error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
