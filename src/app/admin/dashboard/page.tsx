import type { Metadata } from "next";
import { DashboardPageClient } from "@/app/dashboard/DashboardPageClient";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

export default function AdminDashboardPage() {
  return <DashboardPageClient fixedRole="admin" />;
}
