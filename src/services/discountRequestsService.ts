import { apiFetch } from "@/lib/api/httpClient";

export type DiscountRequestRecord = {
  _id: string;
  status: "pending" | "approved" | "rejected";
  billingPlan: "monthly" | "full";
  listPrice: number;
  requestedAmount?: number;
  approvedAmount?: number;
  message: string;
  rejectionNote: string;
  createdAt: string;
  reviewedAt?: string;
  student: { _id: string; name: string; email?: string };
  course: { _id: string; title: string };
  batch?: { _id: string; name: string };
};

export type StudentCoursePricingState = {
  listAmount: number;
  finalAmount: number;
  hasApprovedDiscount: boolean;
  requestStatus: "none" | "pending" | "approved" | "rejected";
  approvedPricingId?: string;
  requestedAmount?: number;
  approvedAmount?: number;
  rejectionNote?: string;
};

export type CreateDiscountRequestInput = {
  courseId: string;
  billingPlan: "monthly" | "full";
  message?: string;
  selectedBatchId?: string;
};

export const discountRequestsService = {
  list(status?: string, courseId?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (courseId) params.set("courseId", courseId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/api/discount-requests${query}`);
  },

  create(input: CreateDiscountRequestInput) {
    return apiFetch(`/api/discount-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  review(
    id: string,
    action: "approve" | "reject",
    options?: { approvedAmount?: number; rejectionNote?: string; note?: string },
  ) {
    return apiFetch(`/api/discount-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...options }),
    });
  },

  async getCoursePricing(
    courseId: string,
    billingPlan: "monthly" | "full",
  ): Promise<StudentCoursePricingState | null> {
    const res = await apiFetch(
      `/api/me/course-pricing/${courseId}?billingPlan=${billingPlan}`,
    );
    const data = await res.json();
    if (!res.ok || !data.success) return null;
    return data.data as StudentCoursePricingState;
  },
};
