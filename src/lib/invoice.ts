import { SITE_BRAND_NAME } from "@/lib/siteBrandingConstants";
import type { PaymentEntityType } from "@/models/Payment";
import { buildInvoicePdfBuffer, type InvoicePdfData } from "@/lib/invoice-pdf";

export type InvoiceBuildInput = {
  transactionId: string;
  amount: number;
  paidAt: Date | string;
  payerName: string;
  payerPhone?: string;
  itemTitle: string;
  entityType: PaymentEntityType;
  entityLabel?: string;
};

export function entityTypeLabel(entityType: PaymentEntityType): string {
  switch (entityType) {
    case "batch":
      return "Batch";
    case "qb_access":
      return "Question Bank Access";
    default:
      return "Course";
  }
}

export function buildInvoicePdfData(input: InvoiceBuildInput): InvoicePdfData {
  const label =
    input.entityLabel ||
    (input.entityType === "qb_access"
      ? "Platform QB"
      : entityTypeLabel(input.entityType));

  const paidAt = new Date(input.paidAt);
  const paidAtIso = Number.isNaN(paidAt.getTime())
    ? new Date().toISOString()
    : paidAt.toISOString();

  return {
    invoiceNumber: input.transactionId,
    studentName: input.payerName,
    studentPhone: input.payerPhone,
    itemTitle: input.itemTitle,
    entityLabel: label,
    amountBdt: Number(input.amount) || 0,
    paidAt: paidAtIso,
    transactionId: input.transactionId,
    platformName: SITE_BRAND_NAME,
  };
}

export async function generateInvoicePdfBuffer(input: InvoiceBuildInput) {
  return buildInvoicePdfBuffer(buildInvoicePdfData(input));
}
