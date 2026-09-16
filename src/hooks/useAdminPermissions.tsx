"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import {
  ALL_ADMIN_PERMISSIONS,
  canAccessAdminPayments,
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/adminPermissions";
import { isSuperAdmin } from "@/lib/roles";

type AdminPermissionsContextValue = {
  loading: boolean;
  permissions: AdminPermission[];
  can: (permission: AdminPermission) => boolean;
  canAccessPayments: boolean;
  refresh: () => Promise<void>;
};

const AdminPermissionsContext = createContext<AdminPermissionsContextValue | null>(
  null,
);

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const [permissions, setPermissions] = useState<AdminPermission[]>(() =>
    isSuperAdmin(role) ? [...ALL_ADMIN_PERMISSIONS] : [],
  );
  const [loading, setLoading] = useState(status === "loading");

  const refresh = useCallback(async () => {
    if (isSuperAdmin(role)) {
      setPermissions([...ALL_ADMIN_PERMISSIONS]);
      setLoading(false);
      return;
    }
    if (role !== "admin") {
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/me", { credentials: "include" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.permissions)) {
        setPermissions(data.permissions);
      } else {
        setPermissions([]);
      }
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (status === "loading") return;
    void refresh();
  }, [refresh, status]);

  const value = useMemo<AdminPermissionsContextValue>(
    () => ({
      loading,
      permissions,
      can: (permission) => hasAdminPermission(permissions, permission, role),
      canAccessPayments: canAccessAdminPayments(permissions, role),
      refresh,
    }),
    [loading, permissions, refresh, role],
  );

  return (
    <AdminPermissionsContext.Provider value={value}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

const EMPTY: AdminPermissionsContextValue = {
  loading: false,
  permissions: [],
  can: () => false,
  canAccessPayments: false,
  refresh: async () => undefined,
};

export function useAdminPermissions(): AdminPermissionsContextValue {
  return useContext(AdminPermissionsContext) ?? EMPTY;
}
