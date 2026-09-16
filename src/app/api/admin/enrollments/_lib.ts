import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isAdminAreaRole } from "@/lib/roles";
import { requireAdminPermission, requireAnyAdminPermission } from "@/app/api/_lib/adminPermissions";

export {
  toPositiveInt,
  mapEnrollmentRow,
  buildEnrollmentStats,
} from "../../instructor/enrollments/_lib";

export async function requireAdminJson() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      ),
    };
  }
  if (!isAdminAreaRole(session.user.role)) {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }
  return { userId: session.user.id };
}

export async function requireEnrollStudentsJson() {
  const auth = await requireAdminPermission("enroll_students");
  if (auth.error) return { error: auth.error };
  return { userId: auth.user!.id };
}

export async function requireManageEnrollmentsJson() {
  const auth = await requireAnyAdminPermission([
    "manage_enrollments",
    "enroll_students",
  ]);
  if (auth.error) return { error: auth.error };
  return { userId: auth.user!.id };
}

export async function requireDeleteEnrollmentJson() {
  const auth = await requireAdminPermission("manage_enrollments");
  if (auth.error) return { error: auth.error };
  return { userId: auth.user!.id };
}
