"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearDashboardError,
  fetchDashboard,
} from "@/store/slices/dashboardSlice";
import { setDashboardView } from "@/store/slices/uiSlice";
import type { DashboardRole } from "@/types/dashboard";
import { AdminDashboardParity } from "./parity/AdminDashboardParity";
import { DashboardParityShell } from "./DashboardParityShell";
import { DashboardRoleSwitcher } from "./DashboardRoleSwitcher";
import { InstructorDashboardParity } from "./parity/InstructorDashboardParity";
import { StudentDashboardParity } from "./parity/StudentDashboardParity";

type DashboardPageClientProps = {
  /** When set (role-area routes), hides QA switcher and fixes dashboard role. */
  fixedRole?: DashboardRole;
};

export function DashboardPageClient({ fixedRole }: DashboardPageClientProps) {
  const dispatch = useAppDispatch();
  const reduxRole = useAppSelector((s) => s.ui.dashboardView);
  const role = fixedRole ?? reduxRole;
  const authUser = useAppSelector((s) => s.auth.user);
  const { status, error, student, instructor, admin } = useAppSelector(
    (s) => s.dashboard,
  );

  const displayName = authUser
    ? authUser.name || "Guest"
    : "Guest";

  useEffect(() => {
    if (fixedRole) {
      dispatch(setDashboardView(fixedRole));
    }
  }, [dispatch, fixedRole]);

  useEffect(() => {
    dispatch(fetchDashboard(role));
  }, [dispatch, role]);

  const refreshAdmin = useCallback(async () => {
    await dispatch(fetchDashboard("admin")).unwrap();
  }, [dispatch]);

  const loading = status === "idle" || status === "loading";
  const failed = status === "failed" && error;

  return (
    <div className="mx-auto w-full min-w-0 max-w-screen-2xl px-4 py-6 sm:px-8">
      {fixedRole ? null : (
        <header className="mb-6 space-y-3">
          <div>
            <h1 className="font-headline text-2xl font-black tracking-tight text-foreground md:text-3xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Role switcher is QA-only. Student dashboard always uses the live API.
            </p>
          </div>
          <DashboardRoleSwitcher />
        </header>
      )}

      {failed ? (
        <div
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p className="font-semibold">Could not load dashboard</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
            onClick={() => {
              dispatch(clearDashboardError());
              dispatch(fetchDashboard(role));
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!failed ? (
        <DashboardParityShell role={role}>
          {role === "student" ? (
            <StudentDashboardParity
              userName={displayName}
              loading={loading}
              enrollments={student?.enrollments ?? []}
              courseProgress={student?.courseProgress ?? []}
              batches={student?.batches ?? []}
              upcomingClasses={student?.upcomingClasses ?? []}
              weeklyRoutine={student?.weeklyRoutine ?? []}
              assignments={student?.assignments ?? []}
              upcomingExams={student?.upcomingExams ?? []}
              metrics={
                student?.metrics ?? {
                  attendance: null,
                  averageGrade: null,
                  payments: {
                    pendingAmount: 0,
                    pendingCount: 0,
                    paidAmount: 0,
                  },
                }
              }
            />
          ) : null}
          {role === "instructor" ? (
            <InstructorDashboardParity
              userName={displayName}
              loading={loading}
              apiData={instructor}
            />
          ) : null}
          {role === "admin" ? (
            <AdminDashboardParity
              dashboardData={admin}
              loading={loading}
              onRefresh={refreshAdmin}
            />
          ) : null}
        </DashboardParityShell>
      ) : null}
    </div>
  );
}
