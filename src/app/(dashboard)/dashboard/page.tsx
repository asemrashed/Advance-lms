import type { Metadata } from "next";
import { DashboardPageClient } from "@/app/dashboard/DashboardPageClient";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
