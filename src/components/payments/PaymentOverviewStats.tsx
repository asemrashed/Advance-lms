"use client";

import type { PaymentStats } from "@/types/payment";
import {
  StaffStatCard,
  StaffStatGrid,
} from "@/components/staff/StaffResponsive";
import {
  LuBanknote,
  LuCheck as CheckCircle,
  LuClock as Clock,
  LuCreditCard,
  LuGlobe,
  LuTrendingUp as TrendingUp,
  LuX as XCircle,
} from "react-icons/lu";
import { formatBdt } from "@/lib/currency";

interface PaymentOverviewStatsProps {
  stats: PaymentStats | null;
  loading?: boolean;
  /** Students see their own spend history — hide platform revenue metrics. */
  variant?: "student" | "staff";
  /** Extra cash / online cards for staff ledgers. */
  showMethodBreakdown?: boolean;
  hideRevenue?: boolean;
}

export function PaymentOverviewStats({
  stats,
  loading = false,
  variant = "staff",
  showMethodBreakdown = false,
  hideRevenue = false,
}: PaymentOverviewStatsProps) {
  const columns = variant === "student" ? "student" : "staff";

  if (loading || !stats) {
    const skeletonCount =
      variant === "student" ? 3 : showMethodBreakdown ? 8 : 6;
    return (
      <StaffStatGrid columns={columns}>
        {[...Array(skeletonCount)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-gray-200 bg-white p-3 sm:p-4"
          >
            <div className="mb-2 h-3 w-3/4 rounded bg-gray-200" />
            <div className="h-6 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </StaffStatGrid>
    );
  }

  const studentCards = [
    {
      title: "Total Transactions",
      value: stats.total,
      icon: <LuCreditCard />,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    {
      title: "Successful Payments",
      value: stats.successful,
      icon: <CheckCircle />,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      title: "Total Paid",
      value: formatBdt(stats.totalRevenue),
      icon: <TrendingUp />,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
  ];

  const methodCards = hideRevenue
    ? []
    : [
        {
          title: "Cash payments",
          value: formatBdt(stats.cashRevenue || 0),
          icon: <LuBanknote />,
          color: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
        },
        {
          title: "Online payments",
          value: formatBdt(stats.onlineRevenue || 0),
          icon: <LuGlobe />,
          color: "text-sky-700",
          bg: "bg-sky-50",
          border: "border-sky-200",
        },
      ];

  const staffCards = [
    ...(showMethodBreakdown ? methodCards : []),
    {
      title: "Total Transactions",
      value: stats.total,
      icon: <LuCreditCard />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      title: "Successful",
      value: stats.successful,
      icon: <CheckCircle />,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: <Clock />,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
    {
      title: "Failed",
      value: stats.failed,
      icon: <XCircle />,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    },
    ...(!hideRevenue
      ? [
          {
            title: "Payment overview",
            value: formatBdt(stats.totalRevenue),
            icon: <TrendingUp />,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-200",
          },
        ]
      : []),
    {
      title: "Success Rate",
      value: `${stats.successRate.toFixed(1)}%`,
      icon: <TrendingUp />,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
    },
  ];
  const cards = variant === "student" ? studentCards : staffCards;

  return (
    <StaffStatGrid columns={columns}>
      {cards.map((card) => (
        <StaffStatCard key={card.title} {...card} />
      ))}
    </StaffStatGrid>
  );
}
