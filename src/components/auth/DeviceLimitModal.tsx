"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type OldestDevice = {
  deviceLabel: string;
  loggedInAt: string;
};

type DeviceLimitModalProps = {
  open: boolean;
  onClose: () => void;
  limit: number;
  oldestDevice: OldestDevice;
  currentDeviceLabel: string;
  onRequestOtp: () => Promise<void>;
  onVerifyOtp: (otp: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
};

function formatLoggedInAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "earlier";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DeviceLimitModal({
  open,
  onClose,
  limit,
  oldestDevice,
  currentDeviceLabel,
  onRequestOtp,
  onVerifyOtp,
  loading,
  error,
}: DeviceLimitModalProps) {
  const [step, setStep] = useState<"prompt" | "otp">("prompt");
  const [otp, setOtp] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("prompt");
      setOtp("");
      setLocalError(null);
      setOtpSending(false);
      setOtpSent(false);
    }
  }, [open]);

  const displayError = localError || error;

  const handleForceLogoutClick = async () => {
    setLocalError(null);
    setOtpSending(true);
    try {
      await onRequestOtp();
      setOtpSent(true);
      setStep("otp");
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send verification code.",
      );
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerify = async () => {
    setLocalError(null);
    const trimmed = otp.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setLocalError("Enter the 6-digit code from your email.");
      return;
    }

    const ok = await onVerifyOtp(trimmed);
    if (!ok) {
      setLocalError("Incorrect or expired code. Please try again.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "prompt" ? "Device limit reached" : "Enter verification code"}
      description={
        step === "prompt"
          ? `Your account allows up to ${limit} active devices. Sign in on this device by logging out your oldest session.`
          : "We sent a 6-digit code to your email. Enter it below to confirm this sign-in."
      }
      size="md"
      showCancelButton={false}
      footer={
        step === "prompt" ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading || otpSending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleForceLogoutClick}
              disabled={loading || otpSending}
            >
              {otpSending
                ? "Sending code..."
                : `Force logout from ${oldestDevice.deviceLabel}`}
            </Button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep("prompt");
                setOtp("");
                setLocalError(null);
              }}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleVerify}
              disabled={loading || otp.trim().length !== 6}
            >
              {loading ? "Verifying..." : "Verify and sign in"}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4 px-1 text-sm text-foreground">
        {step === "prompt" ? (
          <>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-medium">Oldest active device</p>
              <p className="mt-1 text-muted-foreground">
                {oldestDevice.deviceLabel}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Signed in {formatLoggedInAt(oldestDevice.loggedInAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-medium">This device</p>
              <p className="mt-1 text-muted-foreground">{currentDeviceLabel}</p>
            </div>
            <p className="text-muted-foreground">
              For your security, we&apos;ll email you a one-time code before
              logging out the oldest device and signing you in here.
            </p>
          </>
        ) : (
          <>
            {otpSent ? (
              <p className="text-muted-foreground">
                Check your inbox for the verification code. It expires in 10
                minutes.
              </p>
            ) : null}
            <label className="block text-sm font-medium">
              Verification code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.35em] text-foreground"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            </label>
          </>
        )}

        {displayError ? (
          <p className="text-sm text-red-600" role="alert">
            {displayError}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
