"use client";

import { useEffect, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { DashboardRouteLayout } from "@/app/dashboard/DashboardRouteLayout";
import { RoleDashboardSkeleton } from "@/components/skeletons/DashboardSkeletons";
import { useProtectedRouteSession } from "@/hooks/useProtectedRouteSession";
import { useAppDispatch } from "@/store/hooks";
import { setDashboardView } from "@/store/slices/uiSlice";
import type { DashboardRole } from "@/types/dashboard";
import { toDashboardShellRole } from "@/lib/roles";

/**
 * Wraps role-scoped routes (`/student/*`, `/instructor/*`, `/admin/*`): syncs
 * `ui.dashboardView` for sidebar styling + Redux dashboard loads, and applies
 * the persistent sidebar + main shell (same as `/dashboard`).
 */
export function RoleAreaLayout({
  role,
  children,
}: {
  role: DashboardRole;
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();

  useProtectedRouteSession();

  useEffect(() => {
    dispatch(setDashboardView(role));
  }, [dispatch, role]);

  useEffect(() => {
    const themeClass =
      role === "student"
        ? "student-theme"
        : role === "instructor"
          ? "instructor-theme"
          : null;
    if (!themeClass) return;
    document.documentElement.classList.add(themeClass);
    return () => {
      document.documentElement.classList.remove(themeClass);
    };
  }, [role]);

  const shellRole = toDashboardShellRole(session?.user?.role);
  if (status === "loading" || !session?.user || shellRole !== role) {
    return (
      <DashboardRouteLayout>
        <RoleDashboardSkeleton role={role} />
      </DashboardRouteLayout>
    );
  }

  return <DashboardRouteLayout>{children}</DashboardRouteLayout>;
}
