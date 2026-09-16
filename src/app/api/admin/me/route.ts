import { NextResponse } from "next/server";
import { getAdminPermissionUser } from "@/app/api/_lib/adminPermissions";

export async function GET() {
  const auth = await getAdminPermissionUser();
  if (auth.error) return auth.error;

  return NextResponse.json({
    success: true,
    role: auth.user!.role,
    permissions: auth.user!.permissions,
  });
}
