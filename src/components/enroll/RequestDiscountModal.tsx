"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AttractiveTextarea } from "@/components/ui/attractive-textarea";
import { formatBdt } from "@/lib/currency";
import { discountRequestsService } from "@/services/discountRequestsService";

export type RequestDiscountTarget = {
  courseId: string;
  courseTitle: string;
  billingPlan: "monthly" | "full";
  listAmount: number;
  selectedBatchId?: string;
};

interface RequestDiscountModalProps {
  open: boolean;
  onClose: () => void;
  target: RequestDiscountTarget | null;
  onSubmitted?: () => void;
}

export function RequestDiscountModal({
  open,
  onClose,
  target,
  onSubmitted,
}: RequestDiscountModalProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && target) {
      setMessage("");
      setError(null);
    }
  }, [open, target]);

  const handleClose = () => {
    setMessage("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!target) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await discountRequestsService.create({
        courseId: target.courseId,
        billingPlan: target.billingPlan,
        message: message.trim() || undefined,
        selectedBatchId: target.selectedBatchId,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request");
      }
      onSubmitted?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!target) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Request discount"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {target.courseTitle} —{" "}
          {target.billingPlan === "monthly" ? "Monthly plan" : "Full payment"}
        </p>

        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">List price: </span>
          <span className="font-semibold text-foreground">
            {formatBdt(target.listAmount)}
            {target.billingPlan === "monthly" ? " / month" : ""}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Your instructor will review your request and set a discounted price.
        </p>

        <AttractiveTextarea
          label="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Why do you need a discount?"
          rows={3}
        />

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
