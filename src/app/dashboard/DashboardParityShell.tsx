"use client";

import type { ReactNode } from "react";
import type { DashboardRole } from "@/types/dashboard";

/**
 * Decorative scroll shell from `learning-project` dashboard layouts
 * (`StudentDashboardLayout` / `TeacherDashboardLayout` / `DashboardLayout` inset content)
 * — without sidebar/header, so role switcher + global `SiteHeader` remain the only chrome.
 */
export function DashboardParityShell({
  role,
  children,
}: {
  role: DashboardRole;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[60vh] min-w-0 overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute inset-0">
          {role === "student" ? <StudentSymbols /> : null}
          {role === "instructor" ? <TeacherSymbols /> : null}
          {role === "admin" ? <AdminSymbols /> : null}
        </div>
      </div>
      <div
        className={`pointer-events-none absolute inset-0 ${
          role === "student"
            ? "bg-linear-to-br from-transparent via-green-500/10 to-blue-500/10"
            : role === "instructor"
              ? "bg-linear-to-br from-transparent via-purple-500/10 to-indigo-500/10"
              : "bg-linear-to-br from-transparent via-primary/10 to-primary/5"
        }`}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StudentSymbols() {
  return (
    <>
      <div className="absolute top-20 right-20 flex h-8 w-8 items-center justify-center">
        <div className="absolute h-0.5 w-6 bg-green-300" />
        <div className="absolute h-6 w-0.5 bg-green-300" />
      </div>
      <div className="absolute top-32 left-16 flex h-8 w-8 items-center justify-center">
        <div className="absolute h-0.5 w-6 bg-blue-300" />
        <div className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-300" />
        <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-300" />
      </div>
      <div className="absolute top-48 right-32 flex h-8 w-8 items-center justify-center">
        <div className="absolute left-2 top-2 h-0.5 w-4 rotate-45 bg-purple-300" />
        <div className="absolute left-2 top-2 h-4 w-0.5 bg-purple-300" />
        <div className="absolute left-4 top-4 h-0.5 w-2 bg-purple-300" />
      </div>
      <div className="absolute bottom-32 left-20 flex h-8 w-8 items-center justify-center">
        <div className="relative h-6 w-6 rounded-full border border-green-300">
          <div className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-green-300" />
          <div className="absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 bg-green-300" />
        </div>
      </div>
      <div className="absolute bottom-20 right-16 flex h-8 w-8 items-center justify-center">
        <div className="relative h-3 w-6 rounded-full border border-orange-300">
          <div className="absolute left-0 top-0 h-3 w-3 rounded-tl-full border-l-2 border-t-2 border-orange-300" />
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-br-full border-b-2 border-r-2 border-orange-300" />
        </div>
      </div>
      <div className="absolute top-64 left-32 flex h-8 w-8 items-center justify-center">
        <div className="h-4 w-4 rounded-t-full border-l-2 border-r-2 border-t-2 border-green-300" />
        <div className="absolute left-1/2 top-2 h-2 w-0.5 -translate-x-1/2 bg-green-300" />
      </div>
    </>
  );
}

function TeacherSymbols() {
  return (
    <>
      <div className="absolute top-20 right-20 flex h-8 w-8 items-center justify-center">
        <div className="absolute h-0.5 w-6 bg-purple-300" />
        <div className="absolute h-6 w-0.5 bg-purple-300" />
      </div>
      <div className="absolute top-32 left-16 flex h-8 w-8 items-center justify-center">
        <div className="absolute h-0.5 w-6 bg-indigo-300" />
        <div className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-300" />
        <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-300" />
      </div>
      <div className="absolute top-48 right-32 flex h-8 w-8 items-center justify-center">
        <div className="absolute left-2 top-2 h-0.5 w-4 rotate-45 bg-purple-300" />
        <div className="absolute left-2 top-2 h-4 w-0.5 bg-purple-300" />
        <div className="absolute left-4 top-4 h-0.5 w-2 bg-purple-300" />
      </div>
      <div className="absolute bottom-32 left-20 flex h-8 w-8 items-center justify-center">
        <div className="relative h-6 w-6 rounded-full border border-purple-300">
          <div className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-purple-300" />
          <div className="absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 bg-purple-300" />
        </div>
      </div>
      <div className="absolute bottom-20 right-16 flex h-8 w-8 items-center justify-center">
        <div className="relative h-3 w-6 rounded-full border border-orange-300">
          <div className="absolute left-0 top-0 h-3 w-3 rounded-tl-full border-l-2 border-t-2 border-orange-300" />
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-br-full border-b-2 border-r-2 border-orange-300" />
        </div>
      </div>
      <div className="absolute top-64 left-32 flex h-8 w-8 items-center justify-center">
        <div className="h-4 w-4 rounded-t-full border-l-2 border-r-2 border-t-2 border-purple-300" />
        <div className="absolute left-1/2 top-2 h-2 w-0.5 -translate-x-1/2 bg-purple-300" />
      </div>
    </>
  );
}

function AdminSymbols() {
  return (
    <>
      <div className="absolute top-20 right-20 flex h-8 w-8 items-center justify-center">
        <div className="absolute h-0.5 w-6 bg-primary" />
        <div className="absolute h-6 w-0.5 bg-primary" />
      </div>
      <div className="absolute top-32 left-16 flex h-8 w-8 items-center justify-center">
        <div className="absolute h-0.5 w-6 bg-primary/80" />
        <div className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary/80" />
        <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary/80" />
      </div>
      <div className="absolute top-48 right-32 flex h-8 w-8 items-center justify-center">
        <div className="absolute left-2 top-2 h-0.5 w-4 rotate-45 bg-secondary" />
        <div className="absolute left-2 top-2 h-4 w-0.5 bg-secondary" />
        <div className="absolute left-4 top-4 h-0.5 w-2 bg-secondary" />
      </div>
      <div className="absolute bottom-32 left-20 flex h-8 w-8 items-center justify-center">
        <div
          className="relative h-6 w-6 rounded-full border"
          style={{ borderColor: "#10B981" }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2"
            style={{ backgroundColor: "#10B981" }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2"
            style={{ backgroundColor: "#10B981" }}
          />
        </div>
      </div>
      <div className="absolute bottom-20 right-16 flex h-8 w-8 items-center justify-center">
        <div
          className="relative h-3 w-6 rounded-full border"
          style={{ borderColor: "#FF6B35" }}
        >
          <div
            className="absolute left-0 top-0 h-3 w-3 rounded-tl-full border-l-2 border-t-2"
            style={{ borderColor: "#FF6B35" }}
          />
          <div
            className="absolute bottom-0 right-0 h-3 w-3 rounded-br-full border-b-2 border-r-2"
            style={{ borderColor: "#FF6B35" }}
          />
        </div>
      </div>
      <div className="absolute top-64 left-32 flex h-8 w-8 items-center justify-center">
        <div className="h-4 w-4 rounded-t-full border-l-2 border-r-2 border-t-2 border-primary" />
        <div className="absolute left-1/2 top-2 h-2 w-0.5 -translate-x-1/2 bg-primary" />
      </div>
    </>
  );
}
