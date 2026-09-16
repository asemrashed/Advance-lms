"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBdt } from "@/lib/currency";
import {
  discountRequestsService,
  type DiscountRequestRecord,
} from "@/services/discountRequestsService";
import { LuCheck, LuX, LuRefreshCw } from "react-icons/lu";
import Modal from "@/components/ui/modal";
import { AttractiveInput } from "@/components/ui/attractive-input";
import {
  StaffMobileRecordCard,
  StaffRecordField,
  StaffRecordFields,
  StaffReviewActions,
} from "@/components/staff/StaffResponsive";

export function DiscountRequestsPanel() {
  const [rows, setRows] = useState<DiscountRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<DiscountRequestRecord | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approveNote, setApproveNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await discountRequestsService.list("pending");
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.data || []);
      } else {
        setError(data.error || "Failed to load discount requests");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load discount requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openApprove = (row: DiscountRequestRecord) => {
    setApproveTarget(row);
    setApprovedAmount(String(row.listPrice));
    setApproveNote("");
    setError(null);
  };

  const closeApprove = () => {
    setApproveTarget(null);
    setApprovedAmount("");
    setApproveNote("");
  };

  const review = async (
    id: string,
    action: "approve" | "reject",
    options?: { approvedAmount?: number; note?: string; rejectionNote?: string },
  ) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await discountRequestsService.review(id, action, options);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update request");
      }
      setRows((prev) => prev.filter((r) => r._id !== id));
      closeApprove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveSubmit = async () => {
    if (!approveTarget) return;
    const amount = Number(approvedAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid approved amount.");
      return;
    }
    await review(approveTarget._id, "approve", {
      approvedAmount: amount,
      note: approveNote.trim() || undefined,
    });
  };

  const handleReject = async (id: string) => {
    const rejectionNote = window.prompt("Reason for rejection (optional):") || undefined;
    await review(id, "reject", { rejectionNote });
  };

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Discount Requests</h3>
            <p className="text-sm text-gray-500">
              Student discount requests awaiting review
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
            <LuRefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && !approveTarget && (
          <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No pending discount requests.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <StaffMobileRecordCard
                key={row._id}
                actions={
                  <StaffReviewActions>
                    <Button
                      size="sm"
                      onClick={() => openApprove(row)}
                      disabled={busyId === row._id}
                    >
                      <LuCheck className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(row._id)}
                      disabled={busyId === row._id}
                    >
                      <LuX className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </StaffReviewActions>
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
                  <StaffRecordField label="Plan">
                    <Badge variant="outline">{row.billingPlan}</Badge>
                  </StaffRecordField>
                  <StaffRecordField label="Course" fullWidth>
                    {row.course.title}
                  </StaffRecordField>
                  <StaffRecordField label="List price">
                    {formatBdt(row.listPrice)}
                    {row.billingPlan === "monthly" ? " / month" : ""}
                  </StaffRecordField>
                  <StaffRecordField label="Requested">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </StaffRecordField>
                  {row.message ? (
                    <StaffRecordField label="Message" fullWidth>
                      <span className="italic">&ldquo;{row.message}&rdquo;</span>
                    </StaffRecordField>
                  ) : null}
                </StaffRecordFields>
              </StaffMobileRecordCard>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(approveTarget)}
        onClose={closeApprove}
        title="Approve discount"
        size="md"
      >
        {approveTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {approveTarget.student.name} — {approveTarget.course.title}
            </p>
            <p className="text-sm text-gray-500">
              List price: {formatBdt(approveTarget.listPrice)}
              {approveTarget.billingPlan === "monthly" ? " / month" : ""}
            </p>
            <AttractiveInput
              label="Approved price (fixed for all payments)"
              type="number"
              min={0}
              max={approveTarget.listPrice}
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
            />
            <AttractiveInput
              label="Internal note (optional)"
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
            />
            {error && approveTarget && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeApprove}>
                Cancel
              </Button>
              <Button onClick={handleApproveSubmit} disabled={busyId === approveTarget._id}>
                Confirm approval
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
