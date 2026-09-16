import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
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
    grade: searchParams.get("grade")?.trim() || undefined,
    year: searchParams.get("year")?.trim() || undefined,
    subject: searchParams.get("subject")?.trim() || undefined,
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
    if (session.user?.role !== "student") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const filters = parseFilters(request.nextUrl.searchParams);
    const data = await listPayments(
      { audience: "student", userId },
      filters,
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET student payments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}
