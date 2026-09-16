import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import {
  type AdminPermission,
  hasAdminPermission,
  resolveAdminPermissions,
} from "@/lib/adminPermissions";
import { isAdminAreaRole, isSuperAdmin } from "@/lib/roles";

export type AdminPermissionUser = {
  id: string;
  role: "super_admin" | "admin";
  permissions: AdminPermission[];
};

function forbidden() {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Authentication required" },
    { status: 401 },
  );
}

export async function loadAdminPermissionUser(
  userId: string,
  role: string | null | undefined,
): Promise<AdminPermissionUser | null> {
  if (isSuperAdmin(role)) {
    return {
      id: userId,
      role: "super_admin",
      permissions: resolveAdminPermissions(null, { role: "super_admin" }),
    };
  }
  if (role !== "admin") return null;

  await connectDB();
  const row = await User.findById(userId).select("role adminPermissions").lean();
  if (!row || row.role !== "admin") return null;

  return {
    id: userId,
    role: "admin",
    permissions: resolveAdminPermissions(row.adminPermissions, { role: "admin" }),
  };
}

export async function getAdminPermissionUser(): Promise<{
  error: NextResponse | null;
  user: AdminPermissionUser | null;
}> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) return { error: unauthorized(), user: null };
  if (!isAdminAreaRole(role)) return { error: forbidden(), user: null };

  const user = await loadAdminPermissionUser(userId, role);
  if (!user) return { error: forbidden(), user: null };
  return { error: null, user };
}

export async function requireAdminPermission(permission: AdminPermission): Promise<{
  error: NextResponse | null;
  user: AdminPermissionUser | null;
}> {
  const auth = await getAdminPermissionUser();
  if (auth.error || !auth.user) return auth;
  if (!hasAdminPermission(auth.user.permissions, permission, auth.user.role)) {
    return { error: forbidden(), user: null };
  }
  return auth;
}

export async function requireAnyAdminPermission(
  permissions: AdminPermission[],
): Promise<{
  error: NextResponse | null;
  user: AdminPermissionUser | null;
}> {
  const auth = await getAdminPermissionUser();
  if (auth.error || !auth.user) return auth;
  const allowed = permissions.some((permission) =>
    hasAdminPermission(auth.user!.permissions, permission, auth.user!.role),
  );
  if (!allowed) return { error: forbidden(), user: null };
  return auth;
}
