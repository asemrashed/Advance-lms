"use client";

import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setDashboardView } from "@/store/slices/uiSlice";
import type { DashboardRole } from "@/types/dashboard";

const ROLES: { id: DashboardRole; label: string }[] = [
  { id: "student", label: "Student" },
  { id: "instructor", label: "Instructor" },
  { id: "admin", label: "Admin" },
];

export function DashboardRoleSwitcher() {
  const dispatch = useAppDispatch();
  const active = useAppSelector((s) => s.ui.dashboardView);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-surface-container/40 p-2"
      role="radiogroup"
      aria-label="Dashboard role (mock QA)"
    >
      {ROLES.map(({ id, label }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              selected
                ? "bg-primary text-on-primary shadow-md"
                : "text-muted-foreground hover:bg-surface-container hover:text-foreground",
            )}
            onClick={() => {
              dispatch(setDashboardView(id));
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
