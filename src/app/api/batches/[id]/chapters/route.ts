import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import { requireBatchViewAccess } from "@/app/api/_lib/batchAccess";
import { requireSessionUser } from "@/app/api/_lib/phase12";

type LeanChapter = {
  _id: unknown;
  title?: unknown;
  subjectLabel?: unknown;
  order?: unknown;
  isPublished?: unknown;
  instructorId?: unknown;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await connectDB();
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const { id: batchId } = await context.params;
    const access = await requireBatchViewAccess(batchId, auth.user);
    if (access.error) return access.error;

    // Curriculum is shared at the course level — return all course chapters.
    const courseId = access.batch?.courseId
      ? String(access.batch.courseId)
      : null;
    const rows = (await Chapter.find(
      courseId ? { course: courseId } : { batchId },
    )
      .sort({ order: 1, title: 1 })
      .select("_id title subjectLabel order isPublished instructorId")
      .lean()) as LeanChapter[];

    return NextResponse.json({
      success: true,
      data: {
        chapters: rows.map((row) => ({
          _id: String(row._id),
          title: String(row.title),
          subjectLabel: row.subjectLabel ? String(row.subjectLabel) : undefined,
          order: row.order,
          isPublished: row.isPublished !== false,
          instructorId: row.instructorId ? String(row.instructorId) : undefined,
        })),
      },
    });
  } catch (error) {
    console.error("GET batch chapters", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch batch chapters" },
      { status: 500 },
    );
  }
}
