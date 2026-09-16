import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { listPayments, toPositiveInt } from "@/app/api/_lib/paymentQueries";
import type { PaymentFilters } from "@/types/payment";
import { requireAnyAdminPermission } from "@/app/api/_lib/adminPermissions";
import { hasAdminPermission } from "@/lib/adminPermissions";

function parseFilters(searchParams: URLSearchParams): PaymentFilters {
  return {
    page: toPositiveInt(searchParams.get("page"), 1),
    limit: toPositiveInt(searchParams.get("limit"), 10),
    search: searchParams.get("search")?.trim() || undefined,
    status: (searchParams.get("status") as PaymentFilters["status"]) || "all",
    courseId: searchParams.get("courseId")?.trim() || undefined,
    batchId: searchParams.get("batchId")?.trim() || undefined,
    studentId: searchParams.get("studentId")?.trim() || undefined,
    instructorId: searchParams.get("instructorId")?.trim() || undefined,
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
    const auth = await requireAnyAdminPermission([
      "view_payments",
      "view_platform_income",
      "view_instructor_income",
    ]);
    if (auth.error) return auth.error;

    await connectDB();

    const audienceParam = request.nextUrl.searchParams.get("audience") || "students";
    const audience =
      audienceParam === "instructors" ? "admin_instructors" : "admin_students";

    if (
      audience === "admin_students" &&
      !hasAdminPermission(
        auth.user!.permissions,
        "view_platform_income",
        auth.user!.role,
      ) &&
      !hasAdminPermission(auth.user!.permissions, "view_payments", auth.user!.role)
    ) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (
      audience === "admin_instructors" &&
      !hasAdminPermission(
        auth.user!.permissions,
        "view_instructor_income",
        auth.user!.role,
      ) &&
      !hasAdminPermission(auth.user!.permissions, "view_payments", auth.user!.role)
    ) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const filters = parseFilters(request.nextUrl.searchParams);

    const data = await listPayments({ audience }, filters);
    const hidePlatformIncome = !hasAdminPermission(
      auth.user!.permissions,
      "view_platform_income",
      auth.user!.role,
    );
    const hideInstructorIncome = !hasAdminPermission(
      auth.user!.permissions,
      "view_instructor_income",
      auth.user!.role,
    );
    if (
      (audience === "admin_students" && hidePlatformIncome) ||
      (audience === "admin_instructors" && hideInstructorIncome)
    ) {
      data.stats.totalRevenue = 0;
      data.stats.cashRevenue = 0;
      data.stats.onlineRevenue = 0;
      data.stats.cashCount = 0;
      data.stats.onlineCount = 0;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET admin payments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}
