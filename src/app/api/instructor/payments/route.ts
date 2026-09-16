import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  getInstructorScopeIds,
  listPayments,
  toPositiveInt,
} from "@/app/api/_lib/paymentQueries";
import type { PaymentFilters } from "@/types/payment";

function parseFilters(searchParams: URLSearchParams): PaymentFilters {
  return {
    page: toPositiveInt(searchParams.get("page"), 1),
    limit: toPositiveInt(searchParams.get("limit"), 10),
    search: searchParams.get("search")?.trim() || undefined,
    status: (searchParams.get("status") as PaymentFilters["status"]) || "all",
    courseId: searchParams.get("courseId")?.trim() || undefined,
    batchId: searchParams.get("batchId")?.trim() || undefined,
    studentId: searchParams.get("studentId")?.trim() || undefined,
    courseType:
      (searchParams.get("courseType")?.trim() as PaymentFilters["courseType"]) ||
      undefined,
    grade: searchParams.get("grade")?.trim() || undefined,
    year: searchParams.get("year")?.trim() || undefined,
    subject: searchParams.get("subject")?.trim() || undefined,
    method:
      (searchParams.get("method")?.trim() as PaymentFilters["method"]) ||
      undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (session.user?.role !== "instructor") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const view = request.nextUrl.searchParams.get("view") || "own";
    const filters = parseFilters(request.nextUrl.searchParams);

    if (view === "students") {
      const { courseIds, batchIds } = await getInstructorScopeIds(userId);
      const data = await listPayments(
        {
          audience: "instructor_students",
          userId,
          instructorCourseIds: courseIds,
          instructorBatchIds: batchIds,
        },
        filters,
      );
      return NextResponse.json({ success: true, data });
    }

    const data = await listPayments(
      { audience: "instructor_own", userId },
      filters,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET instructor payments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}
