"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import {
  LuBookOpen,
  LuCrown,
  LuGraduationCap,
  LuShield,
} from "react-icons/lu";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthGuestOnly } from "@/components/auth/AuthGuestOnly";
import { PasswordField } from "@/components/auth/PasswordField";
import { DeviceLimitModal } from "@/components/auth/DeviceLimitModal";
import { postAuthRedirectPath } from "@/lib/authRedirects";
import {
  getDeviceUserAgent,
  getOrCreateDeviceId,
} from "@/lib/deviceIdClient";

type DeviceLimitState = {
  limit: number;
  oldestDevice: {
    deviceLabel: string;
    loggedInAt: string;
  };
  currentDeviceLabel: string;
};

type DemoAccount = {
  label: string;
  email: string;
  password: string;
  Icon: ComponentType<{ className?: string }>;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Super Admin",
    email: "superadmin@gmail.com",
    password: "Asdfghjk",
    Icon: LuCrown,
  },
  {
    label: "Admin",
    email: "admin@gmail.com",
    password: "Asdfghjk",
    Icon: LuShield,
  },
  {
    label: "Instructor",
    email: "asem@gmail.com",
    password: "Asdfghjk",
    Icon: LuBookOpen,
  },
  {
    label: "Student",
    email: "hasiv@gmail.com",
    password: "Asdfghjk",
    Icon: LuGraduationCap,
  }
];

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceLimitState, setDeviceLimitState] =
    useState<DeviceLimitState | null>(null);
  const [deviceLimitOpen, setDeviceLimitOpen] = useState(false);
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [deviceLimitError, setDeviceLimitError] = useState<string | null>(null);

  const completeLogin = async (
    loginEmail: string,
    loginPassword: string,
    options?: { deviceLoginToken?: string },
  ) => {
    const deviceId = getOrCreateDeviceId();
    const userAgent = getDeviceUserAgent();

    const result = await signIn("credentials", {
      email: loginEmail.trim(),
      password: loginPassword,
      deviceId,
      userAgent,
      deviceLoginToken: options?.deviceLoginToken || "",
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return false;
    }

    const callbackUrl = new URLSearchParams(window.location.search).get(
      "callbackUrl",
    );

    const session = await getSession();
    const destination = postAuthRedirectPath(session?.user?.role, callbackUrl);
    window.location.assign(destination);
    return true;
  };

  const loginWithCredentials = async (
    loginEmail: string,
    loginPassword: string,
  ) => {
    setError(null);
    setDeviceLimitError(null);
    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const userAgent = getDeviceUserAgent();

      const checkResponse = await fetch("/api/auth/device-limit/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
          deviceId,
          userAgent,
        }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        if (checkResponse.status === 401) {
          setError("Invalid email or password.");
          setLoading(false);
          return;
        }
        setError(checkData.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      if (!checkData.allowed && checkData.reason === "device_limit") {
        setDeviceLimitState({
          limit: checkData.limit,
          oldestDevice: checkData.oldestDevice,
          currentDeviceLabel: checkData.currentDeviceLabel,
        });
        setLoginToken(null);
        setDeviceLimitOpen(true);
        setLoading(false);
        return;
      }

      await completeLogin(loginEmail, loginPassword);
    } catch {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loginWithCredentials(email, password);
  };

  const handleDemoLogin = async (account: DemoAccount) => {
    if (loading) return;
    setEmail(account.email);
    setPassword(account.password);
    await loginWithCredentials(account.email, account.password);
  };

  const handleRequestOtp = async () => {
    setDeviceLimitError(null);

    const response = await fetch("/api/auth/device-limit/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        deviceId: getOrCreateDeviceId(),
        userAgent: getDeviceUserAgent(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to send verification code.");
    }

    setLoginToken(data.loginToken);
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!loginToken) {
      setDeviceLimitError("Request a verification code first.");
      return false;
    }

    setLoading(true);
    setDeviceLimitError(null);

    try {
      const response = await fetch("/api/auth/device-limit/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginToken, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        setDeviceLimitError(data.error || "Verification failed.");
        setLoading(false);
        return false;
      }

      setDeviceLimitOpen(false);
      return await completeLogin(email, password, {
        deviceLoginToken: loginToken,
      });
    } catch {
      setDeviceLimitError("Verification failed. Please try again.");
      setLoading(false);
      return false;
    }
  };

  return (
    <>
      <AuthSplitLayout
        sideTitle="Welcome back"
        sideDescription="Sign in to continue your learning journey with AdvanceLMS."
      >
        <div className="rounded-2xl border border-border bg-card p-8 shadow-editorial">
          <h1 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your email and password.
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
            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              required
            />
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  name="remember"
                  className="cursor-pointer rounded border-border"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="cursor-pointer font-semibold text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-primary py-3 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>

          <div className="mt-8">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((account) => {
                const { Icon } = account;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => void handleDemoLogin(account)}
                    disabled={loading}
                    className="flex min-h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-primary/[0.04] px-2 py-3 text-primary transition hover:border-primary/40 hover:bg-primary/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="text-center text-xs font-semibold leading-tight">
                      {account.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href="/register"
              className="cursor-pointer font-semibold text-primary"
            >
              Register
            </Link>
          </p>
        </div>
      </AuthSplitLayout>

      {deviceLimitState ? (
        <DeviceLimitModal
          open={deviceLimitOpen}
          onClose={() => {
            setDeviceLimitOpen(false);
            setDeviceLimitError(null);
            setLoginToken(null);
          }}
          limit={deviceLimitState.limit}
          oldestDevice={deviceLimitState.oldestDevice}
          currentDeviceLabel={deviceLimitState.currentDeviceLabel}
          onRequestOtp={handleRequestOtp}
          onVerifyOtp={handleVerifyOtp}
          loading={loading}
          error={deviceLimitError}
        />
      ) : null}
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthGuestOnly>
      <LoginForm />
    </AuthGuestOnly>
  );
}
