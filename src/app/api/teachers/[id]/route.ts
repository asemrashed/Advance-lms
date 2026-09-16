import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Course from "@/models/Course";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { isValidBdPhone, toBdLocalPhone } from "@/lib/phone";
import { getDisplayName, resolveNameFromBody } from "@/lib/displayName";
import { requireAdminPermission } from "@/app/api/_lib/adminPermissions";
import {
  accountStatusToFlags,
  resolveAccountStatus,
  type AccountStatus,
} from "@/lib/accountStatus";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requireManageTeachersJson() {
  const auth = await requireAdminPermission("manage_teachers");
  return auth.error;
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireManageTeachersJson();
    if (authError) return authError;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid teacher ID" }, { status: 400 });
    }

    const existing = await User.findById(id).lean();
    if (!existing || existing.role !== "instructor") {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};
    const unsetData: Record<string, 1> = {};

    if (typeof body.name === "string" || typeof body.firstName === "string" || typeof body.lastName === "string") {
      const name = resolveNameFromBody(body);
      if (!name) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 },
        );
      }
      updateData.name = name;
    }
    if (typeof body.phone === "string") {
      const phoneRaw = body.phone.trim();
      if (!phoneRaw) {
        unsetData.phone = 1;
      } else {
        const phoneClean = toBdLocalPhone(phoneRaw);
        if (!isValidBdPhone(phoneClean)) {
          return NextResponse.json(
            { error: "Phone number must start with 0 and be like 01XXXXXXXXX" },
            { status: 400 },
          );
        }
        const dup = await User.findOne({
          phone: phoneClean,
          _id: { $ne: id },
        })
          .select("_id")
          .lean();
        if (dup) {
          return NextResponse.json(
            { error: "User already exists with this phone number" },
            { status: 409 },
          );
        }
        updateData.phone = phoneClean;
      }
    }
    if (
      typeof body.accountStatus === "string" &&
      ["pending", "active", "blocked"].includes(body.accountStatus)
    ) {
      const flags = accountStatusToFlags(body.accountStatus as AccountStatus);
      updateData.accountStatus = flags.accountStatus;
      updateData.isActive = flags.isActive;
    } else if (typeof body.isActive === "boolean") {
      const flags = accountStatusToFlags(body.isActive ? "active" : "blocked");
      updateData.accountStatus = flags.accountStatus;
      updateData.isActive = flags.isActive;
    }
    if (typeof body.avatar === "string") {
      updateData.avatar = body.avatar.trim() || "";
    }
    if (typeof body.experience === "string") {
      updateData.experience = body.experience.trim();
    }
    if (typeof body.email === "string") {
      const emailClean = normalizeEmail(body.email);
      if (!isValidEmail(emailClean)) {
        return NextResponse.json(
          { error: "A valid email is required" },
          { status: 400 },
        );
      }
      const emailDup = await User.findOne({
        email: emailClean,
        _id: { $ne: id },
      })
        .select("_id")
        .lean();
      if (emailDup) {
        return NextResponse.json(
          { error: "User already exists with this email" },
          { status: 409 },
        );
      }
      updateData.email = emailClean;
    }
    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 },
        );
      }
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    const updated = await User.findByIdAndUpdate(
      id,
      {
        ...(Object.keys(updateData).length ? { $set: updateData } : {}),
        ...(Object.keys(unsetData).length ? { $unset: unsetData } : {}),
      },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json(mapTeacher(updated as Record<string, unknown>));
  } catch (error) {
    console.error("Teacher update error:", error);
    return NextResponse.json(
      { error: "Failed to update teacher" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireManageTeachersJson();
    if (authError) return authError;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid teacher ID" }, { status: 400 });
    }

    const existing = await User.findById(id).lean();
    if (!existing || existing.role !== "instructor") {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const oid = new mongoose.Types.ObjectId(id);
    const courseCount = await Course.countDocuments({
      $or: [{ instructor: oid }, { createdBy: oid }],
    });
    if (courseCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete teacher linked to courses; reassign courses or deactivate the account",
        },
        { status: 409 },
      );
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teacher delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete teacher" },
      { status: 500 },
    );
  }
}
