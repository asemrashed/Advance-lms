import { DashboardRouteLayout } from "@/app/dashboard/DashboardRouteLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardRouteLayout>{children}</DashboardRouteLayout>;
}
