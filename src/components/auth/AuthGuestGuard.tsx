"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { postAuthRedirectPath } from "@/lib/authRedirects";

type AuthGuestGuardProps = {
  children: ReactNode;
};

/**
 * Redirects signed-in users away from auth pages.
 * Uses a full page navigation so we never leave a soft-nav stuck on login.
 */
export function AuthGuestGuard({ children }: AuthGuestGuardProps) {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl"),
    [searchParams],
  );

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    const destination = postAuthRedirectPath(session.user.role, callbackUrl);
    // Avoid soft router.replace here — it raced with login and left the UI on /login.
    if (window.location.pathname === destination) return;
    window.location.replace(destination);
  }, [callbackUrl, session?.user, status]);

  return <>{children}</>;
}
