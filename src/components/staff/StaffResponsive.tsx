"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function StaffStatGrid({
  children,
  className,
  columns = "staff",
}: {
  children: ReactNode;
  className?: string;
  columns?: "staff" | "compact" | "student";
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:gap-3",
        columns === "student" && "lg:grid-cols-3",
        columns === "compact" && "lg:grid-cols-4",
        columns === "staff" && "lg:grid-cols-3 2xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StaffStatCard({
  title,
  value,
  icon,
  color,
  bg,
  border,
}: {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border bg-white p-3 transition-shadow hover:shadow-md sm:p-4",
        border || "border-gray-200",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-medium leading-tight text-gray-600 sm:text-sm">
            {title}
          </p>
          <p className="truncate text-lg font-bold tabular-nums text-gray-900 sm:text-2xl">
            {value}
          </p>
        </div>
        {icon ? (
          <div className={cn("shrink-0 rounded-lg p-1.5 sm:p-3", bg)}>
            <span className={cn("block [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-6 sm:[&>svg]:w-6", color)}>
              {icon}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StaffSearchRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full min-w-0 items-center gap-2", className)}>
      {children}
    </div>
  );
}

export function StaffFilterGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StaffChipTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const cols =
    tabs.length <= 2
      ? "grid-cols-2"
      : tabs.length === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className={cn("grid w-full gap-2", cols, className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "min-w-0 truncate rounded-lg border px-2.5 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-gray-900",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? ` (${tab.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}

export function StaffRecordFields({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-2", className)}>
      {children}
    </div>
  );
}

export function StaffRecordField({
  label,
  children,
  fullWidth = false,
  className,
}: {
  label: string;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", fullWidth && "col-span-2", className)}>
      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="break-words text-sm text-gray-900">{children}</div>
    </div>
  );
}

export function StaffMobileRecordCard({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-3 shadow-sm",
        className,
      )}
    >
      {children}
      {actions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function StaffReviewActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto", className)}>
      {children}
    </div>
  );
}
