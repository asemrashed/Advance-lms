export type BatchEnrollmentRow = {
  _id: string;
  batchId: string;
  studentId: string;
  status: string;
  paymentStatus: string;
  enrolledAt: string;
  batchInfo?: {
    _id: string;
    name?: string;
    subject?: string;
  };
};

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string };

async function parseJsonBody<T>(response: Response): Promise<ApiEnvelope<T>> {
  const text = await response.text();
  if (!text.trim()) {
    return { success: false, error: `Request failed (${response.status})` };
  }
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return { success: false, error: `Request failed (${response.status})` };
  }
}

async function parseResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const body = await parseJsonBody<T>(response);
  if (!response.ok || !body.success) {
    throw new Error(body.error || "Request failed");
  }
  return body;
}

/** POST /api/batch-enrollments — register current user for a batch. */
export async function registerForBatch(batchId: string, billingPlan?: "monthly" | "full") {
  const response = await fetch("/api/batch-enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ batchId, billingPlan }),
  });
  return parseResponse<{
    requiresPayment?: boolean;
    batchId?: string;
    _id?: string;
    status?: string;
    paymentStatus?: string;
  }>(response);
}

/** POST /api/payment/initiate — SSLCommerz checkout for batch fee. */
export async function initiateBatchPayment(batchId: string, billingPlan?: "monthly" | "full") {
  const response = await fetch("/api/payment/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ batchId, billingPlan }),
  });
  const body = await parseJsonBody<{
    checkout_url?: string;
    transactionId?: string;
    enrolled?: boolean;
    requiresPayment?: boolean;
  }>(response);
  if (!response.ok || !body.success) {
    const fallback =
      response.status === 500
        ? "Payment gateway is unreachable. Check your network or try again later."
        : "Payment initiation failed";
    throw new Error(body.error || fallback);
  }
  return body;
}

/** GET /api/batch-enrollments — current user's batch enrollments. */
export async function getMyBatchEnrollments() {
  const response = await fetch("/api/batch-enrollments", {
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse<{ enrollments: BatchEnrollmentRow[] }>(response);
}
