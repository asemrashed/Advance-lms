import type { Metadata } from "next";
import { DashboardPageClient } from "@/app/dashboard/DashboardPageClient";

export const metadata: Metadata = {
  title: "Instructor dashboard",
};

export default function InstructorDashboardPage() {
  return <DashboardPageClient fixedRole="instructor" />;
}
