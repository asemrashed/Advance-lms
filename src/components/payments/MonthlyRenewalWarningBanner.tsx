"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  duePaymentsService,
  type DuePaymentItem,
} from "@/services/enrollmentRequestsService";
import { LuTriangleAlert } from "react-icons/lu";

/**
 * Amber warning when a paid month has ended and the student is in the
 * 15-day extension (or already blocked). Also triggers notice creation via the due API.
 */
export function MonthlyRenewalWarningBanner() {
  const [items, setItems] = useState<DuePaymentItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await duePaymentsService.list();
        const data = await res.json();
        if (!cancelled && res.ok && data.success) {
          const due = (data.data?.due || []) as DuePaymentItem[];
          setItems(due.filter((d) => d.reason === "renewal"));
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  const grace = items.filter((i) => i.phase === "grace");
  const expired = items.filter((i) => i.phase === "expired");
  const primary = grace[0] || expired[0];
  const until = primary?.accessExpiresAt
    ? new Date(primary.accessExpiresAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const isBlocked = grace.length === 0 && expired.length > 0;

  return (
    <div
      role="alert"
      className={
        isBlocked
          ? "mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          : "mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2">
          <LuTriangleAlert
            className={`mt-0.5 h-5 w-5 shrink-0 ${isBlocked ? "text-red-600" : "text-amber-600"}`}
          />
          <div>
            <p className="font-semibold">
              {isBlocked
                ? "Monthly fee overdue — access paused"
                : "Monthly fee reminder"}
            </p>
            <p className="mt-1 text-xs sm:text-sm">
              {isBlocked
                ? `Pay now to restore access to ${expired.map((i) => i.title).join(", ")}. Your instructor can grant 7 extra days if you need more time.`
                : `Your paid month has ended. You still have access until ${until || "the end of the 15-day grace period"}. Please pay before then to avoid interruption${
                    grace.length > 1 ? ` (${grace.length} courses/batches)` : ""
                  }.`}
            </p>
          </div>
        </div>
        <Link
          href="/student/payments"
          className={
            isBlocked
              ? "shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-red-700"
              : "shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-amber-700"
          }
        >
          Pay now
        </Link>
      </div>
    </div>
  );
}
