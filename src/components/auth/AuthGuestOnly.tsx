"use client";

import { Suspense, type ReactNode } from "react";
import { AuthGuestGuard } from "@/components/auth/AuthGuestGuard";

/** Suspense for useSearchParams — keep auth UI; no public GlobalLoading interstitial. */
export function AuthGuestOnly({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthGuestGuard>{children}</AuthGuestGuard>
    </Suspense>
  );
}
