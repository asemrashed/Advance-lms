import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { isValidBdPhone, toBdLocalPhone } from "@/lib/phone";
import {
  accountStatusToFlags,
  resolveAccountStatus,
  type AccountStatus,
} from "@/lib/accountStatus";
import { getDisplayName, resolveNameFromBody } from "@/lib/displayName";
import { isAdminAreaRole } from "@/lib/roles";
import { requireAdminPermission } from "@/app/api/_lib/adminPermissions";
import {
  escapeRegex,
} from "@/app/api/_lib/phase12";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function requireAdminJson() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  if (!isAdminAreaRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

async function requireManageTeachersJson() {
  const auth = await requireAdminPermission("manage_teachers");
  return auth.error;
}

/** List teachers — admin and instructors (needed for batch/routine pickers). */
async function requireStaffJson() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  if (!isAdminAreaRole(session.user.role) && session.user.role !== "instructor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function mapTeacher(user: Record<string, unknown>) {
  const accountStatus = resolveAccountStatus({
    accountStatus: user.accountStatus as AccountStatus | undefined,
    isActive: user.isActive as boolean | undefined,
    role: user.role as string | undefined,
  });

  const addressRaw = user.address;
  const address =
    typeof addressRaw === "string" && addressRaw.trim()
      ? { fullAddress: addressRaw.trim() }
      : undefined;

  return {
    _id: String(user._id),
    email: String(user.email || ""),
    phone: user.phone ? String(user.phone) : undefined,
    name: getDisplayName(user),
    role: "instructor" as const,
    accountStatus,
    isActive: accountStatus === "active",
    avatar: user.avatar ? String(user.avatar) : undefined,
    bio: user.bio ? String(user.bio) : undefined,
    experience: user.experience ? String(user.experience) : undefined,
    education: user.education ? String(user.education) : undefined,
    passOutInstitute: user.passOutInstitute ? String(user.passOutInstitute) : undefined,
    specialization: user.specialization ? String(user.specialization) : undefined,
    address,
    socialLinks: user.socialLinks ?? undefined,
    bankDetails: user.bankDetails ?? undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireStaffJson();
    if (authError) return authError;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 500);
    const search = String(searchParams.get("search") || "").trim();
    const status = String(searchParams.get("status") || "all").trim();

    const filter: Record<string, unknown> = { role: "instructor" };
    const statusClauses: Record<string, unknown>[] = [];

    if (status === "pending") {
      statusClauses.push(
        { accountStatus: "pending" },
        { accountStatus: { $exists: false }, isActive: false },
      );
    } else if (status === "active") {
      statusClauses.push(
        { accountStatus: "active" },
        { accountStatus: { $exists: false }, isActive: { $ne: false } },
      );
    } else if (status === "blocked") {
      statusClauses.push({ accountStatus: "blocked" });
    } else if (status === "approved") {
      statusClauses.push(
        { accountStatus: { $in: ["active", "blocked"] } },
        { accountStatus: { $exists: false }, isActive: { $ne: false } },
      );
    } else if (status === "inactive") {
      statusClauses.push(
        { accountStatus: { $in: ["pending", "blocked"] } },
        { accountStatus: { $exists: false }, isActive: false },
      );
    }

    if (search) {
      const searchClause: Record<string, unknown>[] = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { phone: { $regex: escapeRegex(search), $options: "i" } },
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        searchClause.push({ _id: new mongoose.Types.ObjectId(search) });
      }

      const andClauses: Record<string, unknown>[] = [{ $or: searchClause }];
      if (statusClauses.length > 0) {
        andClauses.unshift({ $or: statusClauses });
      }
      filter.$and = andClauses;
    } else if (statusClauses.length > 0) {
      filter.$or = statusClauses;
    }

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    const teachers = rows.map((u) => mapTeacher(u as Record<string, unknown>));
    const pages = total > 0 ? Math.ceil(total / limit) : 0;

    return NextResponse.json({
      teachers,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error("Teachers list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teachers" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireManageTeachersJson();
    if (authError) return authError;

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;
    const name = resolveNameFromBody(body);
    const emailClean = normalizeEmail(String(body.email || ""));
    const phoneRaw = String(body.phone || "").trim();
    const phoneClean = phoneRaw ? toBdLocalPhone(phoneRaw) : "";

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }
    if (!isValidEmail(emailClean)) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }
    if (phoneRaw && !isValidBdPhone(phoneClean)) {
      return NextResponse.json(
        { error: "Phone number must start with 0 and be like 01XXXXXXXXX" },
        { status: 400 },
      );
    }

    const password = String(body.password || "");
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const existingEmail = await User.findOne({ email: emailClean })
      .select("_id")
      .lean();
    if (existingEmail) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 409 },
      );
    }

    if (phoneClean) {
      const existingPhone = await User.findOne({ phone: phoneClean })
        .select("_id")
        .lean();
      if (existingPhone) {
        return NextResponse.json(
          { error: "User already exists with this phone number" },
          { status: 409 },
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const isActive = body.isActive !== false;
    const statusFlags = accountStatusToFlags(isActive ? "active" : "blocked");

    const user = await User.create({
      name,
      email: emailClean,
      ...(phoneClean ? { phone: phoneClean } : {}),
      password: hashedPassword,
      role: "instructor",
      ...statusFlags,
      avatar:
        typeof body.avatar === "string" && body.avatar.trim()
          ? body.avatar.trim()
          : undefined,
      experience:
        typeof body.experience === "string" && body.experience.trim()
          ? body.experience.trim()
          : undefined,
    });

    return NextResponse.json(mapTeacher(user.toObject()), { status: 201 });
  } catch (error) {
    console.error("Teacher create error:", error);
    return NextResponse.json(
      { error: "Failed to create teacher" },
      { status: 500 },
    );
  }
}
