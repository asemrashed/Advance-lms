"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isSuperAdmin } from "@/lib/roles";

/** Client gate for routes that only super admins may open. */
export function SuperAdminOnlyGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const allowed = isSuperAdmin(session?.user?.role);

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) router.replace("/admin/dashboard");
  }, [allowed, router, status]);

  if (status === "loading" || !allowed) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }

  return <>{children}</>;
}
