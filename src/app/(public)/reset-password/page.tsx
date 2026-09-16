"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthGuestOnly } from "@/components/auth/AuthGuestOnly";
import { PasswordField } from "@/components/auth/PasswordField";
import GlobalLoading from "@/components/GlobalLoading";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("This reset link is invalid or incomplete.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Unable to reset password.");
        return;
      }

      setSuccess(data?.message ?? "Password updated successfully.");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch {
      setError("Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-editorial">
      <h1 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-foreground">
        Set new password
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a new password for your AdvanceLMS account.
      </p>
      {!token ? (
        <p className="mt-6 text-sm text-red-600" role="alert">
          This reset link is invalid or incomplete. Request a new one from the
          forgot password page.
        </p>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <PasswordField
            label="New password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            required
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-700" role="status">
              {success}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-primary py-3 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="cursor-pointer font-semibold text-primary">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthGuestOnly>
      <AuthSplitLayout
        sideTitle="Choose a new password"
        sideDescription="Use the link from your email to securely update your AdvanceLMS password."
      >
        <Suspense fallback={<GlobalLoading theme="public" label="Loading reset form..." />}>
          <ResetPasswordForm />
        </Suspense>
      </AuthSplitLayout>
    </AuthGuestOnly>
  );
}
