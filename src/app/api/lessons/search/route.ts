import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { listManagedLessons } from "@/lib/lessons/management";
import { isAdminAreaRole } from "@/lib/roles";

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
    const result = await listManagedLessons({
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
    if (error instanceof Error && error.message === "invalid_chapter") {
      return NextResponse.json(
        { success: false, error: "Invalid chapter ID" },
        { status: 400 },
      );
    }
    console.error("Lesson search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search lessons" },
      { status: 500 },
    );
  }
}
