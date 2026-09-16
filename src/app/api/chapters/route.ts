import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { isAdminAreaRole } from "@/lib/roles";
import {
  createChapterFromSubjectCatalog,
  listManagedChapters,
} from "@/lib/chapters/management";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const result = await listManagedChapters({
      userId,
      role,
      query: new URL(request.url).searchParams,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_course") {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "course_not_found") {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }
    console.error("Chapters list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chapters" },
      { status: 500 },
    );
  }
}

/**
 * Add a chapter onto a course from the subject's admin-defined catalog.
 * Blank subject chapters are not auto-seeded; instructors opt them in here.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const courseId = String(body.course || body.courseId || "").trim();
    const title = String(body.title || body.name || "").trim();

    const result = await createChapterFromSubjectCatalog({
      courseId,
      title,
      userId,
      role,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.chapter,
        meta: { created: result.created },
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    console.error("Chapter create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create chapter" },
      { status: 500 },
    );
  }
}
