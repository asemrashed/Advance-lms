"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthGuestOnly } from "@/components/auth/AuthGuestOnly";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Unable to send reset link.");
        return;
      }

      setSuccess(
        data?.message ??
          "If an account exists for that email, we sent a password reset link.",
      );
    } catch {
      setError("Unable to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      sideTitle="Reset access"
      sideDescription="Enter your email and we will send a link to reset your AdvanceLMS password."
    >
      <div className="rounded-2xl border border-border bg-card p-8 shadow-editorial">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-foreground">
          Forgot password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email associated with your account.
        </p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-foreground">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
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
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="cursor-pointer font-semibold text-primary">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthGuestOnly>
      <ForgotPasswordForm />
    </AuthGuestOnly>
  );
}
