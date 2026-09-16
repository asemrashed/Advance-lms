import type { Metadata } from "next";
import AdminBatchReconcileClient from "./AdminBatchReconcileClient";
import { SuperAdminOnlyGate } from "@/components/auth/SuperAdminOnlyGate";

export const metadata: Metadata = {
  title: "Batch payment reconciliation",
};

export default function AdminBatchReconcilePage() {
  return (
    <SuperAdminOnlyGate>
      <AdminBatchReconcileClient />
    </SuperAdminOnlyGate>
  );
}
