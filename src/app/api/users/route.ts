import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";
import { toBdLocalPhone } from "@/lib/phone";
import { normalizeEmail } from "@/lib/email";
import {
  escapeRegex,
} from "@/app/api/_lib/phase12";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseRoles(roleParam: string): string[] {
  const aliases: Record<string, string> = { teacher: "instructor" };
  return roleParam
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
    .map((r) => aliases[r] ?? r);
}

import { getDisplayName } from "@/lib/displayName";
import { isAdminAreaRole } from "@/lib/roles";

function mapUser(user: Record<string, unknown>) {
  return {
    _id: String(user._id),
    name: getDisplayName(user),
    email: user.email ? String(user.email) : "",
    phone: user.phone ? String(user.phone) : "",
    role: String(user.role || ""),
    avatar: user.avatar ? String(user.avatar) : undefined,
    isActive: user.isActive !== false,
  };
}

async function requireStaffJson() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }
  const role = session.user.role;
  if (!isAdminAreaRole(role) && role !== "instructor") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkExists = searchParams.get("checkExists") === "true";
    const phoneRaw = String(searchParams.get("phone") || "").trim();
    const emailRaw = String(searchParams.get("email") || "").trim();

    if (checkExists && (phoneRaw || emailRaw)) {
      const auth = await requireStaffJson();
      if ("error" in auth && auth.error) return auth.error;

      await connectDB();
      if (emailRaw) {
        const email = normalizeEmail(emailRaw);
        const existing = await User.findOne({ email }).select("_id").lean();
        return NextResponse.json({ exists: Boolean(existing) });
      }
      const phone = toBdLocalPhone(phoneRaw);
      const existing = await User.findOne({ phone }).select("_id").lean();
      return NextResponse.json({ exists: Boolean(existing) });
    }

    const auth = await requireStaffJson();
    if ("error" in auth && auth.error) return auth.error;

    await connectDB();
    const roleParam = String(searchParams.get("role") || "student").trim();
    const roles = parseRoles(roleParam);
    const allowedRoles = roles.filter((r) =>
      ["admin", "instructor", "student"].includes(r),
    );
    if (allowedRoles.length === 0) {
      return NextResponse.json(
        { error: "Valid role filter is required" },
        { status: 400 },
      );
    }

    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 100), 500);
    const search = String(searchParams.get("search") || "").trim();

    const filter: Record<string, unknown> = { role: { $in: allowedRoles } };
    if (search) {
      const orClause: Record<string, unknown>[] = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
        { phone: { $regex: escapeRegex(search), $options: "i" } },
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        orClause.push({ _id: new mongoose.Types.ObjectId(search) });
      }
      filter.$or = orClause;
    }

    const rows = await User.find(filter)
      .select("name email phone role avatar isActive")
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      users: rows.map((u) => mapUser(u as Record<string, unknown>)),
    });
  } catch (error) {
    console.error("Users list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
