import type { Metadata } from "next";
import { DashboardPageClient } from "@/app/dashboard/DashboardPageClient";

export const metadata: Metadata = {
  title: "Student dashboard",
};

/** Canonical student dashboard — `GET /api/student/dashboard` via Redux (Phase 15 + 17.7). */
export default function StudentDashboardPage() {
  return <DashboardPageClient fixedRole="student" />;
}
