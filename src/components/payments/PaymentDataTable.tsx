"use client";

import DataTable, { type Column, type Action } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import type { PaymentRecord } from "@/types/payment";
import { formatDateTime, formatTimeAgo, getInitials } from "@/lib/formatters";
import { formatBdt } from "@/lib/currency";
import { LuDownload as Download, LuReceipt as Receipt, LuEye as Eye } from "react-icons/lu";

export type PaymentTableMode =
  | "student"
  | "instructor_own"
  | "instructor_students"
  | "admin";

function statusBadge(status: string) {
  const config = {
    success: { color: "bg-green-100 text-green-800", label: "Success" },
    pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    failed: { color: "bg-red-100 text-red-800", label: "Failed" },
  }[status] || { color: "bg-gray-100 text-gray-800", label: status };

  return <Badge className={`${config.color} border-0`}>{config.label}</Badge>;
}

interface PaymentDataTableProps {
  payments: PaymentRecord[];
  loading: boolean;
  mode: PaymentTableMode;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  extraActions?: Action<PaymentRecord>[];
  onPayerClick?: (payment: PaymentRecord) => void;
}

export function PaymentDataTable({
  payments,
  loading,
  mode,
  pagination,
  onPageChange,
  extraActions = [],
  onPayerClick,
}: PaymentDataTableProps) {
  const showPayer = mode === "instructor_students" || mode === "admin";

  const payerColumn: Column<PaymentRecord> = {
    key: "payer",
    label: mode === "admin" ? "Payer" : "Student",
    width: "w-1/5",
    mobileFullWidth: true,
    render: (payment) => {
      const payer = payment.payer;
      if (!payer) return <span className="text-gray-400">—</span>;
      const name = (
        <p className="text-sm font-medium text-gray-900 truncate">
          {payer.name || "Unknown"}
        </p>
      );
      return (
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
            {getInitials(payer.name)}
          </div>
          <div className="min-w-0">
            {onPayerClick ? (
              <button
                type="button"
                className="text-left text-primary hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onPayerClick(payment);
                }}
              >
                {name}
              </button>
            ) : (
              name
            )}
            <p className="text-xs text-gray-500 truncate">{payer.phone || payer.email || ""}</p>
          </div>
        </div>
      );
    },
  };

  const columns: Column<PaymentRecord>[] = [
    ...(showPayer ? [payerColumn] : []),
    {
      key: "item",
      label: "Description",
      width: "w-1/4",
      mobileFullWidth: true,
      render: (payment) => (
        <div>
          <p className="text-sm font-medium text-gray-900 truncate">
            {payment.item?.title || "Payment"}
          </p>
          <p className="text-xs text-gray-500">
            {payment.item?.batchName
              ? `${payment.item?.typeLabel} · ${payment.item.batchName}`
              : payment.item?.typeLabel}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      width: "w-28",
      render: (payment) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-gray-900">
            {formatBdt(payment.amount)}
          </span>
          {payment.discountApplied &&
            payment.originalAmount != null &&
            payment.originalAmount > payment.amount && (
              <>
                <span className="text-xs text-gray-400 line-through">
                  {formatBdt(payment.originalAmount)}
                </span>
                <Badge className="w-fit border-0 bg-emerald-100 text-emerald-800 text-[10px]">
                  Discount
                </Badge>
              </>
            )}
        </div>
      ),
    },
    {
      key: "method",
      label: "Method",
      width: "w-24",
      render: (payment) => (
        <Badge
          className={
            payment.gateway === "cash"
              ? "border-0 bg-amber-100 text-amber-800"
              : "border-0 bg-sky-100 text-sky-800"
          }
        >
          {payment.methodLabel || (payment.gateway === "cash" ? "Offline" : "Online")}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-20",
      render: (payment) => statusBadge(payment.status),
    },
    {
      key: "transactionId",
      label: "Transaction",
      width: "w-28",
      render: (payment) => (
        <span className="text-xs font-mono text-gray-600 truncate block max-w-[120px]">
          {payment.transactionId}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      width: "w-28",
      render: (payment) => (
        <div>
          <p className="text-sm text-gray-600">{formatDateTime(payment.createdAt)}</p>
          <p className="text-xs text-gray-500">{formatTimeAgo(payment.createdAt)}</p>
        </div>
      ),
    },
  ];

  const actions: Action<PaymentRecord>[] = [
    ...extraActions,
    {
      key: "view-invoice",
      label: (payment) => (payment.canDownloadInvoice ? "View invoice" : "No invoice"),
      icon: <Eye className="w-4 h-4" />,
      onClick: (payment) => {
        if (payment.canDownloadInvoice) {
          window.open(
            `/api/payments/${encodeURIComponent(payment.transactionId)}/invoice?inline=1`,
            "_blank",
          );
        }
      },
      variant: "secondary",
    },
    {
      key: "invoice",
      label: (payment) => (payment.canDownloadInvoice ? "Download invoice" : "No invoice"),
      icon: <Download className="w-4 h-4" />,
      onClick: (payment) => {
        if (payment.canDownloadInvoice) {
          window.open(
            `/api/payments/${encodeURIComponent(payment.transactionId)}/invoice`,
            "_blank",
          );
        }
      },
      variant: "secondary",
    },
  ];

  return (
    <DataTable
      data={payments}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={{
        title: "No payments found",
        description: "Payment history will appear here after successful transactions.",
        icon: <Receipt className="w-12 h-12 text-gray-400" />,
      }}
      pagination={{ ...pagination, onPageChange }}
      variant="table"
      getItemId={(p) => p._id}
    />
  );
}
