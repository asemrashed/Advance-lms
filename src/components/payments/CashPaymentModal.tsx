"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatBdt } from "@/lib/currency";
import {
  enrollmentRequestsService,
  type CreateEnrollmentRequestInput,
} from "@/services/enrollmentRequestsService";
import { LuUpload, LuX, LuFileText } from "react-icons/lu";

export type CashPaymentTarget = {
  kind: "course" | "batch";
  id: string;
  batchId?: string;
  title: string;
  billingPlan: "monthly" | "full";
  amount?: number;
  monthlyAmount?: number;
  allowMonthly?: boolean;
};

interface CashPaymentModalProps {
  open: boolean;
  onClose: () => void;
  target: CashPaymentTarget | null;
  onSubmitted?: () => void;
}

export function CashPaymentModal({
  open,
  onClose,
  target,
  onSubmitted,
}: CashPaymentModalProps) {
  const [files, setFiles] = useState<{ url: string; fileName: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [billingPlan, setBillingPlan] = useState<"monthly" | "full">("full");

  useEffect(() => {
    if (open && target) {
      setBillingPlan(target.billingPlan || "full");
      setFiles([]);
      setNote("");
      setError(null);
    }
  }, [open, target]);

  const selectedAmount =
    billingPlan === "monthly"
      ? target?.monthlyAmount ?? target?.amount
      : target?.amount;

  const handleClose = () => {
    setFiles([]);
    setNote("");
    setError(null);
    setBillingPlan("full");
    onClose();
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        const uploaded = await enrollmentRequestsService.uploadProof(file);
        setFiles((prev) => [...prev, { url: uploaded.url, fileName: uploaded.fileName }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!target) return;
    if (files.length === 0) {
      setError("Please upload at least one proof document.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input: CreateEnrollmentRequestInput = {
        entityType: target.kind,
        billingPlan,
        proofUrls: files.map((f) => f.url),
        note: note.trim() || undefined,
      };
      if (target.kind === "course") {
        input.courseId = target.id;
        if (target.batchId) input.batchId = target.batchId;
      } else {
        input.batchId = target.id;
      }

      const res = await enrollmentRequestsService.create(input);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request");
      }
      setFiles([]);
      setNote("");
      setError(null);
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Pay in cash"
      description={
        target
          ? `Submit payment proof for ${target.title} (${billingPlan === "monthly" ? "Monthly" : "Full"})`
          : ""
      }
      size="md"
      footer={
        <div className="flex w-full gap-3">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting || uploading || files.length === 0}
          >
            {submitting ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-4">
        {target?.allowMonthly && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={billingPlan === "full" ? "default" : "outline"}
              onClick={() => setBillingPlan("full")}
            >
              Pay full{target.amount != null ? ` (${formatBdt(target.amount)})` : ""}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={billingPlan === "monthly" ? "default" : "outline"}
              onClick={() => setBillingPlan("monthly")}
            >
              Monthly{target.monthlyAmount != null ? ` (${formatBdt(target.monthlyAmount)})` : ""}
            </Button>
          </div>
        )}

        {selectedAmount != null && selectedAmount > 0 && (
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            Amount to pay: <span className="font-semibold">{formatBdt(selectedAmount)}</span>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Payment proof (PDF or image)
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400">
            <LuUpload className="mb-2 h-6 w-6 text-gray-400" />
            <span className="text-sm text-gray-600">
              {uploading ? "Uploading..." : "Click to upload cheque / screenshot / receipt"}
            </span>
            <input
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
          </label>
        </div>

        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((file, idx) => (
              <li
                key={`${file.url}-${idx}`}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <LuFileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{file.fileName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-red-500"
                >
                  <LuX className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Reference number, payment date, etc."
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>
    </Modal>
  );
}
