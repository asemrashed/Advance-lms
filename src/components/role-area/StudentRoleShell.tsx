"use client";

import type { ReactNode } from "react";

/** Inner scroll + decorative background from `learning-project` `StudentDashboardLayout` (no duplicate sidebar/header). */
export function StudentRoleShell({ children }: { children: ReactNode }) {
  return (
    <div className="student-theme relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-background pb-16 lg:pb-0">
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute left-0 top-0 h-full w-full">
          <div className="absolute right-20 top-20 flex h-8 w-8 items-center justify-center">
            <div className="absolute h-0.5 w-6 bg-green-300" />
            <div className="absolute h-6 w-0.5 bg-green-300" />
          </div>
          <div className="absolute left-16 top-32 flex h-8 w-8 items-center justify-center">
            <div className="absolute h-0.5 w-6 bg-blue-300" />
            <div className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-300" />
            <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-300" />
          </div>
          <div className="absolute right-32 top-48 flex h-8 w-8 items-center justify-center">
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
          <div className="absolute left-32 top-64 flex h-8 w-8 items-center justify-center">
            <div className="h-4 w-4 rounded-t-full border-l-2 border-r-2 border-t-2 border-green-300" />
            <div className="absolute left-1/2 top-2 h-2 w-0.5 -translate-x-1/2 bg-green-300" />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-green-50/10 to-blue-50/10" />
      {children}
    </div>
  );
}
