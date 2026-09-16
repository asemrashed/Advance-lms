"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutWithDeviceRevoke } from "@/lib/logoutClient";

const SESSION_VALIDATE_MS = 15_000;
const SESSION_UNAUTH_GRACE_MS = 1500;

function loginRedirectUrl(pathname: string) {
  const callbackUrl = `${pathname}${window.location.search}`;
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

type SessionValidity = "valid" | "invalid" | "unknown";

async function readServerSessionValidity(): Promise<SessionValidity> {
  try {
    const response = await fetch("/api/auth/session/validate", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (response.status >= 500) return "unknown";
    if (!response.ok) return "invalid";
    const data = (await response.json()) as { valid?: boolean };
    if (data.valid === true) return "valid";
    if (data.valid === false) return "invalid";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function forceLoginRedirect(pathname: string) {
  await signOutWithDeviceRevoke({ redirect: false });
  window.location.assign(loginRedirectUrl(pathname));
}

/**
 * Keeps role-scoped routes in sync with server-side session/device state.
 * Handles force-logout from another device without trapping the user on a skeleton screen.
 */
export function useProtectedRouteSession() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (status === "loading" || redirectingRef.current) return;

    if (!session?.user) {
      const timeout = window.setTimeout(() => {
        if (redirectingRef.current) return;
        redirectingRef.current = true;
        void forceLoginRedirect(pathname);
      }, SESSION_UNAUTH_GRACE_MS);
      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;

    const validate = async () => {
      const validity = await readServerSessionValidity();
      if (cancelled || redirectingRef.current || validity !== "invalid") return;
      redirectingRef.current = true;
      await forceLoginRedirect(pathname);
    };

    void validate();
    const interval = window.setInterval(validate, SESSION_VALIDATE_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname, session?.user, status]);
}
