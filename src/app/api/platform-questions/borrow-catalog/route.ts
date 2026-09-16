import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  listBorrowCatalogSubjects,
  listBorrowCatalogTopics,
  listBorrowCatalogQuestions,
} from "@/app/api/_lib/platformQbCatalog";

/**
 * GET /api/platform-questions/borrow-catalog?view=subjects|topics|questions
 * Instructors browse catalog (subjects/topics; questions only when shared).
 * Admins can also use this for Give Access filters.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const view = (searchParams.get("view") || "subjects").trim();

    if (view === "topics") {
      const data = await listBorrowCatalogTopics(searchParams);
      return NextResponse.json({ success: true, data });
    }
    if (view === "questions") {
      const data = await listBorrowCatalogQuestions(searchParams);
      return NextResponse.json({ success: true, data });
    }

    const data = await listBorrowCatalogSubjects(searchParams);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Borrow catalog GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load platform QB catalog" },
      { status: 500 },
    );
  }
}
