"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBdt } from "@/lib/currency";
import { usePayment } from "@/hooks/usePayment";
import { CashPaymentModal, type CashPaymentTarget } from "./CashPaymentModal";
import type { DuePaymentItem } from "@/services/enrollmentRequestsService";
import { cn } from "@/lib/utils";
import { LuCreditCard, LuBanknote } from "react-icons/lu";

interface PayableItemsListProps {
  items: DuePaymentItem[];
  emptyText?: string;
  onCashSubmitted?: () => void;
}

export function PayableItemsList({
  items,
  emptyText = "Nothing to pay right now.",
  onCashSubmitted,
}: PayableItemsListProps) {
  const { initiatePayment, redirectToPayment, loading } = usePayment();
  const [cashTarget, setCashTarget] = useState<CashPaymentTarget | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payOnline = async (item: DuePaymentItem) => {
    setPayingId(item.id);
    setError(null);
    const res = await initiatePayment({
      courseId: item.kind === "course" ? item.id : undefined,
      batchId: item.kind === "batch" ? item.id : undefined,
      billingPlan: item.billingPlan,
    });
    setPayingId(null);
    if (res.success && res.data?.checkout_url) {
      redirectToPayment(res.data.checkout_url);
    } else {
      setError(res.error || "Failed to start payment");
    }
  };

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {items.map((item) => {
        const isGraceRenewal = item.reason === "renewal" && item.phase === "grace";
        const isExpiredRenewal =
          item.reason === "renewal" && item.phase === "expired";
        return (
          <div
            key={`${item.kind}-${item.id}-${item.reason}`}
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between",
              isGraceRenewal && "border-amber-300 bg-amber-50/80",
              isExpiredRenewal && "border-red-300 bg-red-50/70",
              !isGraceRenewal && !isExpiredRenewal && "border-gray-200 bg-white",
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-gray-900">
                  {item.title}
                </p>
                <Badge className="border-0 bg-gray-100 text-gray-700">
                  {item.kind === "batch" ? "Batch" : "Course"}
                </Badge>
                <Badge
                  className={
                    isExpiredRenewal
                      ? "border-0 bg-red-100 text-red-800"
                      : isGraceRenewal
                        ? "border-0 bg-amber-100 text-amber-900"
                        : item.reason === "renewal"
                          ? "border-0 bg-amber-100 text-amber-800"
                          : "border-0 bg-blue-100 text-blue-800"
                  }
                >
                  {isExpiredRenewal
                    ? "Access blocked — pay now"
                    : isGraceRenewal
                      ? "Pay before grace ends"
                      : item.reason === "renewal"
                        ? "Renewal due"
                        : "Payment pending"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {item.billingPlan === "monthly" ? "Monthly plan" : "Full payment"}
                {isGraceRenewal && item.accessExpiresAt
                  ? ` · pay by ${new Date(item.accessExpiresAt).toLocaleDateString()} to keep access`
                  : item.reason === "pending" && item.paymentDueAt
                    ? ` · pay by ${new Date(item.paymentDueAt).toLocaleDateString()}`
                    : item.accessExpiresAt
                    ? ` · access ended ${new Date(item.accessExpiresAt).toLocaleDateString()}`
                    : ""}
                {" · "}
                {item.discountApplied &&
                item.originalAmount != null &&
                item.originalAmount > item.amount ? (
                  <>
                    <span className="text-gray-400 line-through">
                      {formatBdt(item.originalAmount)}
                    </span>
                    {" "}
                    <span className="font-semibold text-emerald-700">
                      {formatBdt(item.amount)}
                    </span>
                    <Badge className="ml-1 border-0 bg-emerald-100 text-emerald-800 text-[10px]">
                      Discount
                    </Badge>
                  </>
                ) : (
                  <span className="font-semibold text-gray-800">
                    {formatBdt(item.amount)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => payOnline(item)}
                disabled={loading && payingId === item.id}
              >
                <LuCreditCard className="mr-1 h-4 w-4" />
                {loading && payingId === item.id ? "..." : "Pay online"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCashTarget({
                    kind: item.kind,
                    id: item.id,
                    title: item.title,
                    billingPlan: item.billingPlan,
                    amount: item.amount,
                  })
                }
              >
                <LuBanknote className="mr-1 h-4 w-4" />
                Pay in cash
              </Button>
            </div>
          </div>
        );
      })}

      <CashPaymentModal
        open={Boolean(cashTarget)}
        onClose={() => setCashTarget(null)}
        target={cashTarget}
        onSubmitted={onCashSubmitted}
      />
    </div>
  );
}
