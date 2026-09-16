import { apiFetch } from "@/lib/api/httpClient";

export type EnrollmentRequestRecord = {
  _id: string;
  status: "pending" | "approved" | "rejected";
  entityType: "course" | "batch";
  billingPlan: "monthly" | "full";
  amount: number | null;
  proofUrls: string[];
  note: string;
  rejectionNote: string;
  createdAt: string;
  student: { _id: string; name: string; email?: string };
  course?: { _id: string; title: string };
  batch?: { _id: string; name: string };
};

export type CreateEnrollmentRequestInput = {
  entityType: "course" | "batch";
  courseId?: string;
  batchId?: string;
  billingPlan: "monthly" | "full";
  proofUrls: string[];
  note?: string;
};

export const enrollmentRequestsService = {
  list(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiFetch(`/api/enrollment-requests${query}`);
  },

  create(input: CreateEnrollmentRequestInput) {
    return apiFetch(`/api/enrollment-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  review(id: string, action: "approve" | "reject", rejectionNote?: string) {
    return apiFetch(`/api/enrollment-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionNote }),
    });
  },

  async uploadProof(file: File): Promise<{ url: string; type: string; fileName: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/payment-proof", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to upload proof");
    }
    return { url: data.file.url, type: data.file.type, fileName: data.file.fileName };
  },
};

export type DuePaymentItem = {
  kind: "course" | "batch";
  id: string;
  title: string;
  billingPlan: "monthly" | "full";
  amount: number;
  originalAmount?: number;
  discountApplied?: boolean;
  accessExpiresAt?: string;
  paymentDueAt?: string;
  paidMonthEndedAt?: string;
  phase?: "grace" | "expired";
  reason: "renewal" | "pending";
};

export const duePaymentsService = {
  list() {
    return apiFetch(`/api/student/payments/due`);
  },
};
