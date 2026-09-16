import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/app/api/_lib/phase12";
import User from "@/models/User";
import { accountStatusToFlags } from "@/lib/accountStatus";
import { getDisplayName } from "@/lib/displayName";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sendAdminInviteEmail } from "@/lib/mail";
import { ADMIN_AREA_ROLES } from "@/lib/roles";
import {
  DEFAULT_ADMIN_PERMISSIONS,
  resolveAdminPermissions,
  sanitizeAdminPermissions,
} from "@/lib/adminPermissions";

function mapAdmin(user: Record<string, unknown>) {
  const role = user.role === "super_admin" ? "super_admin" : "admin";
  return {
    _id: String(user._id),
    name: getDisplayName(user),
    email: String(user.email || ""),
    role,
    accountStatus: user.accountStatus || "active",
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    adminPermissions: resolveAdminPermissions(user.adminPermissions, { role }),
  };
}

/** List platform admins (admin + super_admin). Super admin only. */
export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const users = await User.find({ role: { $in: [...ADMIN_AREA_ROLES] } })
      .select("name firstName lastName email role accountStatus isActive createdAt lastLogin adminPermissions")
      .sort({ role: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      admins: users.map((u) => mapAdmin(u as Record<string, unknown>)),
    });
  } catch (error) {
    console.error("[admin/admins] GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to load admins" },
      { status: 500 },
    );
  }
}

/**
 * Invite a new admin: create account with email + temporary password and email credentials.
 * Super admin only. Always creates role "admin" (never super_admin).
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const emailClean = normalizeEmail(String(body.email || ""));
    const tempPassword = String(body.temporaryPassword || body.password || "").trim();
    const nameRaw = String(body.name || "").trim();

    if (!isValidEmail(emailClean)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address" },
        { status: 400 },
      );
    }
    if (tempPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Temporary password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const existing = await User.findOne({ email: emailClean }).select("_id role email").lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const name =
      nameRaw ||
      emailClean.split("@")[0]?.replace(/[._+-]/g, " ").trim() ||
      "Admin";

    const hashed = await bcrypt.hash(tempPassword, 12);
    const statusFlags = accountStatusToFlags("active");
    const adminPermissions = body.adminPermissions
      ? sanitizeAdminPermissions(body.adminPermissions)
      : [...DEFAULT_ADMIN_PERMISSIONS];

    const created = await User.create({
      name,
      email: emailClean,
      password: hashed,
      role: "admin",
      adminPermissions,
      ...statusFlags,
    });

    const inviter = await User.findById(auth.user!.id).select("name firstName lastName email").lean();
    const invitedByName = inviter ? getDisplayName(inviter) : undefined;

    try {
      await sendAdminInviteEmail({
        to: emailClean,
        name,
        temporaryPassword: tempPassword,
        invitedByName,
      });
    } catch (mailError) {
      console.error("[admin/admins] invite email failed", mailError);
      // Account exists; surface mail failure so super admin can resend / share manually.
      return NextResponse.json(
        {
          success: true,
          warning: "Admin created but invitation email failed to send. Share the temporary password manually.",
          admin: mapAdmin(created.toObject() as Record<string, unknown>),
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        admin: mapAdmin(created.toObject() as Record<string, unknown>),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[admin/admins] POST", error);
    return NextResponse.json(
      { success: false, error: "Failed to create admin" },
      { status: 500 },
    );
  }
}
