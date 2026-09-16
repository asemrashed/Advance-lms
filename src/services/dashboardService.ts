import { getDashboardByRole } from "@/lib/api/dashboardClient";
import type { DashboardRole } from "@/types/dashboard";

export const dashboardService = {
  fetchDashboard(role: DashboardRole) {
    return getDashboardByRole(role);
  },
};
