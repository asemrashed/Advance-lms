"use client";

import type { ReactNode } from "react";
import { AdminRoleShell } from "@/components/role-area/AdminRoleShell";
import { InstructorRoleShell } from "@/components/role-area/InstructorRoleShell";
import AdminPageWrapper from "@/components/AdminPageWrapper";
import { Button } from "@/components/ui/button";

type StaffResourceStubProps = {
  role: "admin" | "instructor";
  title: string;
  description: string;
  phaseNote: string;
};

function Shell({
  role,
  children,
}: {
  role: "admin" | "instructor";
  children: ReactNode;
}) {
  if (role === "admin") {
    return (
      <AdminRoleShell>
        <AdminPageWrapper>{children}</AdminPageWrapper>
      </AdminRoleShell>
    );
  }
  return <InstructorRoleShell>{children}</InstructorRoleShell>;
}

export function StaffResourceStub({
  role,
  title,
  description,
  phaseNote,
}: StaffResourceStubProps) {
  return (
    <Shell role={role}>
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <Button type="button" disabled>
            Add (Phase 18.1+)
          </Button>
        </header>

        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-base font-semibold text-foreground">
            Management UI shell ready
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {phaseNote}
          </p>
        </div>
      </div>
    </Shell>
  );
}
