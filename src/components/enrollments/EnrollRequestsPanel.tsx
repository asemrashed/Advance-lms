"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBdt } from "@/lib/currency";
import { resolveUploadSrc } from "@/lib/resolveUploadSrc";
import {
  enrollmentRequestsService,
  type EnrollmentRequestRecord,
} from "@/services/enrollmentRequestsService";
import { LuCheck, LuX, LuFileText, LuRefreshCw } from "react-icons/lu";
import {
  StaffMobileRecordCard,
  StaffRecordField,
  StaffRecordFields,
  StaffReviewActions,
} from "@/components/staff/StaffResponsive";

export function EnrollRequestsPanel({
  canReview = true,
}: {
  canReview?: boolean;
}) {
  const [rows, setRows] = useState<EnrollmentRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await enrollmentRequestsService.list("pending");
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.data || []);
      } else {
        setError(data.error || "Failed to load requests");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (
    id: string,
    action: "approve" | "reject",
  ) => {
    let rejectionNote: string | undefined;
    if (action === "reject") {
      rejectionNote = window.prompt("Reason for rejection (optional):") || undefined;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await enrollmentRequestsService.review(id, action, rejectionNote);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update request");
      }
      setRows((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Enroll Requests</h3>
          <p className="text-sm text-gray-500">
            Cash / offline enrollment requests awaiting review
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
          <LuRefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No pending enrollment requests.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <StaffMobileRecordCard
              key={row._id}
              actions={
                canReview ? (
                <StaffReviewActions>
                  <Button
                    size="sm"
                    onClick={() => review(row._id, "approve")}
                    disabled={busyId === row._id}
                  >
                    <LuCheck className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => review(row._id, "reject")}
                    disabled={busyId === row._id}
                  >
                    <LuX className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </StaffReviewActions>
                ) : undefined
              }
            >
              <StaffRecordFields>
                <StaffRecordField label="Student">
                  <span className="font-medium">{row.student.name}</span>
                  {row.student.email ? (
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                      {row.student.email}
                    </span>
                  ) : null}
                </StaffRecordField>
                <StaffRecordField label="Type">
                  <div className="flex flex-wrap gap-1">
                    <Badge className="border-0 bg-gray-100 text-gray-700">
                      {row.entityType === "batch" ? "Batch" : "Course"}
                    </Badge>
                    <Badge className="border-0 bg-indigo-100 text-indigo-800">
                      {row.billingPlan === "monthly" ? "Monthly" : "Full"}
                    </Badge>
                  </div>
                </StaffRecordField>
                <StaffRecordField label="Item" fullWidth>
                  {row.course?.title || row.batch?.name || "—"}
                </StaffRecordField>
                {row.amount != null && row.amount > 0 ? (
                  <StaffRecordField label="Amount">{formatBdt(row.amount)}</StaffRecordField>
                ) : null}
                {row.proofUrls.length > 0 ? (
                  <StaffRecordField label="Proof" fullWidth={!(row.amount != null && row.amount > 0)}>
                    <div className="flex flex-wrap gap-1">
                      {row.proofUrls.map((url, idx) => {
                        const href = resolveUploadSrc(url);
                        return (
                          <a
                            key={`${url}-${idx}`}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            <LuFileText className="h-3.5 w-3.5" />
                            Proof {idx + 1}
                          </a>
                        );
                      })}
                    </div>
                  </StaffRecordField>
                ) : null}
                {row.note ? (
                  <StaffRecordField label="Note" fullWidth>
                    <span className="italic">“{row.note}”</span>
                  </StaffRecordField>
                ) : null}
              </StaffRecordFields>
            </StaffMobileRecordCard>
          ))}
        </div>
      )}
    </div>
  );
}
