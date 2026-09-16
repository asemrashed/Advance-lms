"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminPageWrapper from "@/components/AdminPageWrapper";
import { AdminRoleShell } from "@/components/role-area/AdminRoleShell";
import {
  PaymentHistoryClient,
  paymentsService,
} from "@/components/payments/PaymentHistoryClient";
import type { PaymentFilterVariant } from "@/components/payments/PaymentHistoryFilters";
import type { PaymentTableMode } from "@/components/payments/PaymentDataTable";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

function AdminPaymentsContent() {
  const router = useRouter();
  const { status } = useSession();
  const { can, canAccessPayments, loading } = useAdminPermissions();
  const canStudents = can("view_platform_income") || can("view_payments");
  const canInstructors = can("view_instructor_income") || can("view_payments");
  const hideStudentRevenue = !can("view_platform_income");
  const hideInstructorRevenue = !can("view_instructor_income");

  const tabs = useMemo(() => {
    const next: Array<{ id: string; label: string }> = [];
    if (canStudents) next.push({ id: "students", label: "Student Payments" });
    if (canInstructors) next.push({ id: "instructors", label: "Instructor Payments" });
    return next;
  }, [canStudents, canInstructors]);

  const [activeTab, setActiveTab] = useState("students");

  useEffect(() => {
    if (status === "loading" || loading) return;
    if (!canAccessPayments) {
      router.replace("/admin/dashboard");
    }
  }, [canAccessPayments, loading, router, status]);

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, tabs]);

  const isStudents = activeTab === "students";
  const tableMode: PaymentTableMode = "admin";
  const filterVariant: PaymentFilterVariant = isStudents
    ? "admin_students"
    : "admin_instructors";

  if (status === "loading" || loading || !canAccessPayments || !tabs.length) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }

  return (
    <PaymentHistoryClient
      role="admin"
      title="Payment History"
      description="Monitor student and instructor cash, online, and overall payments"
      tableMode={tableMode}
      filterVariant={filterVariant}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showCourseBatchFilters
      showMethodBreakdown
      hideRevenue={isStudents ? hideStudentRevenue : hideInstructorRevenue}
      fetchPayments={(query) => {
        const params = new URLSearchParams(query);
        params.set("audience", activeTab);
        return paymentsService.listAdminPayments(params.toString());
      }}
    />
  );
}

export default function AdminPaymentsClient() {
  return (
    <AdminPageWrapper>
      <AdminRoleShell>
        <AdminPaymentsContent />
      </AdminRoleShell>
    </AdminPageWrapper>
  );
}
