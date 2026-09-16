import type { PaymentEntityType } from "@/models/Payment";

export type PaymentStatus = "pending" | "success" | "failed";

export type PaymentMethodFilter = "online" | "offline";

export interface PaymentPayerInfo {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface PaymentItemInfo {
  title: string;
  type: PaymentEntityType;
  typeLabel: string;
  courseId?: string;
  batchId?: string;
  batchName?: string;
  grade?: string;
  subject?: string;
}

export interface PaymentRecord {
  _id: string;
  transactionId: string;
  amount: number;
  originalAmount?: number;
  discountApplied?: boolean;
  status: PaymentStatus;
  gateway: "sslcommerz" | "cash";
  methodLabel: "Online" | "Offline";
  entityType: PaymentEntityType;
  createdAt: string;
  updatedAt: string;
  payer?: PaymentPayerInfo;
  item?: PaymentItemInfo;
  canDownloadInvoice: boolean;
}

export interface PaymentStats {
  total: number;
  successful: number;
  pending: number;
  failed: number;
  totalRevenue: number;
  successRate: number;
  cashRevenue: number;
  onlineRevenue: number;
  cashCount: number;
  onlineCount: number;
}

export interface PaymentListResponse {
  payments: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: PaymentStats;
}

export interface PaymentFilters {
  page: number;
  limit: number;
  search?: string;
  status?: PaymentStatus | "all";
  courseId?: string;
  batchId?: string;
  studentId?: string;
  instructorId?: string;
  courseType?: "recorded" | "live";
  grade?: string;
  year?: string;
  subject?: string;
  method?: PaymentMethodFilter | "all";
}

export type PaymentAudience = "student" | "instructor_own" | "instructor_students" | "admin_students" | "admin_instructors";
