import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSuperAdmin } from "@/app/api/_lib/phase12";
import User from "@/models/User";
import { accountStatusToFlags } from "@/lib/accountStatus";
import { ADMIN_AREA_ROLES } from "@/lib/roles";
import { sanitizeAdminPermissions } from "@/lib/adminPermissions";

type RouteContext = { params: Promise<{ id: string }> };

/** Block or remove a regular admin (not super_admin, not self). */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid admin ID" },
        { status: 400 },
      );
    }

    if (id === auth.user!.id) {
      return NextResponse.json(
        { success: false, error: "You cannot remove your own account" },
        { status: 400 },
      );
    }

    const target = await User.findById(id);
    if (!target || !ADMIN_AREA_ROLES.includes(target.role as "admin" | "super_admin")) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 },
      );
    }

    if (target.role === "super_admin") {
      return NextResponse.json(
        { success: false, error: "Cannot remove a super admin" },
        { status: 403 },
      );
    }

    Object.assign(target, accountStatusToFlags("blocked"));
    target.sessionVersion = (target.sessionVersion ?? 0) + 1;
    await target.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/admins/:id] DELETE", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove admin" },
      { status: 500 },
    );
  }
}

/** Update a regular admin's work limits. Super admin only. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid admin ID" },
        { status: 400 },
      );
    }

    const target = await User.findById(id);
    if (!target || target.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (!("adminPermissions" in body)) {
      return NextResponse.json(
        { success: false, error: "adminPermissions is required" },
        { status: 400 },
      );
    }

    target.adminPermissions = sanitizeAdminPermissions(body.adminPermissions);
    await target.save();

    return NextResponse.json({
      success: true,
      admin: {
        _id: String(target._id),
        name: target.name,
        email: target.email,
        role: "admin",
        adminPermissions: target.adminPermissions,
      },
    });
  } catch (error) {
    console.error("[admin/admins/:id] PATCH", error);
    return NextResponse.json(
      { success: false, error: "Failed to update admin permissions" },
      { status: 500 },
    );
  }
}
