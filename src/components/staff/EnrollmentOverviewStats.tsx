"use client";

import {
  StaffStatCard,
  StaffStatGrid,
} from "@/components/staff/StaffResponsive";
import type { EnrollmentStats } from "@/types/enrollment";
import {
  LuCheck as CheckCircle,
  LuClock as Clock,
  LuUsers,
  LuX as XCircle,
} from "react-icons/lu";

interface EnrollmentOverviewStatsProps {
  stats: EnrollmentStats | null;
  loading?: boolean;
}

export function EnrollmentOverviewStats({
  stats,
  loading = false,
}: EnrollmentOverviewStatsProps) {
  if (loading || !stats) {
    return (
      <StaffStatGrid columns="compact">
        {[...Array(4)].map((_, i) => (
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

  const cards = [
    {
      title: "Total Enrollments",
      value: stats.total,
      icon: <LuUsers />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      title: "Paid",
      value: stats.paid,
      icon: <CheckCircle />,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      title: "Unpaid",
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
  ];

  return (
    <StaffStatGrid columns="compact">
      {cards.map((card) => (
        <StaffStatCard key={card.title} {...card} />
      ))}
    </StaffStatGrid>
  );
}
