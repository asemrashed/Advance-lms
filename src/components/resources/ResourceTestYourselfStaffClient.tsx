"use client";

import type { ReactNode } from "react";
import { AdminRoleShell } from "@/components/role-area/AdminRoleShell";
import { InstructorRoleShell } from "@/components/role-area/InstructorRoleShell";
import AdminPageWrapper from "@/components/AdminPageWrapper";
import { TestYourselfStaffWorkspace } from "@/components/resources/TestYourselfStaffWorkspace";

type Props = {
  role: "admin" | "instructor";
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

export function ResourceTestYourselfStaffClient({ role }: Props) {
  return (
    <Shell role={role}>
      <TestYourselfStaffWorkspace role={role} />
    </Shell>
  );
}
