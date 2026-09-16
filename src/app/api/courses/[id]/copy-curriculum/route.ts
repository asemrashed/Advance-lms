import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdminAreaRole } from "@/lib/roles";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/courses/[id]/copy-curriculum — disabled in Phase 1.
 * Chapters are owned by Subject and seeded on course create.
 */
export async function POST(_request: NextRequest, _context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!isAdminAreaRole(session.user.role) && session.user.role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Chapters come from the subject catalog. Add them in Curriculum Builder. Copying curriculum chapters is disabled.",
      },
      { status: 403 },
    );
  } catch (error) {
    console.error("POST /api/courses/[id]/copy-curriculum", error);
    return NextResponse.json(
      { success: false, error: "Failed to copy curriculum" },
      { status: 500 },
    );
  }
}
