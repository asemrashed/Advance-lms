import { apiFetch } from "@/lib/api/httpClient";

export const batchReconcileService = {
  listQueue() {
    return apiFetch("/api/admin/batch-enrollments/reconcile");
  },

  reconcile(id: string, body: { action: "activate" | "note"; note?: string }) {
    return apiFetch(`/api/admin/batch-enrollments/${id}/reconcile`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};
