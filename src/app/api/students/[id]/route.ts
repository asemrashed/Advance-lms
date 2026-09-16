import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Enrollment from "@/models/Enrollment";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { isValidBdPhone, toBdLocalPhone } from "@/lib/phone";
import { getDisplayName, resolveNameFromBody } from "@/lib/displayName";
import { requireAdminPermission } from "@/app/api/_lib/adminPermissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requireManageStudentsJson() {
  const auth = await requireAdminPermission("manage_students");
  return auth.error;
}

function mapStudent(
  user: Record<string, unknown>,
  extras?: { enrollmentCount?: number; totalEnrolledAmount?: number },
) {
  return {
    _id: String(user._id),
    email: String(user.email || ""),
    phone: user.phone,
    name: getDisplayName(user),
    role: "student" as const,
    isActive: user.isActive !== false,
    avatar: user.avatar ? String(user.avatar) : undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
    enrollmentCount: extras?.enrollmentCount ?? 0,
    totalEnrolledAmount: extras?.totalEnrolledAmount ?? 0,
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireManageStudentsJson();
    if (authError) return authError;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const existing = await User.findById(id).lean();
    if (!existing || existing.role !== "student") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
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
    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }
    if (typeof body.avatar === "string") {
      updateData.avatar = body.avatar.trim() || "";
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
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const agg = await Enrollment.aggregate<{
      enrollmentCount: number;
      totalEnrolledAmount: number;
    }>([
      { $match: { student: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          enrollmentCount: { $sum: 1 },
          totalEnrolledAmount: { $sum: { $ifNull: ["$paymentAmount", 0] } },
        },
      },
    ]);
    const stat = agg[0];

    return NextResponse.json(
      mapStudent(updated as Record<string, unknown>, {
        enrollmentCount: stat?.enrollmentCount,
        totalEnrolledAmount: stat?.totalEnrolledAmount,
      }),
    );
  } catch (error) {
    console.error("Student update error:", error);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireManageStudentsJson();
    if (authError) return authError;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const existing = await User.findById(id).lean();
    if (!existing || existing.role !== "student") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const enrollmentCount = await Enrollment.countDocuments({
      student: id,
    });
    if (enrollmentCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete student with existing enrollments; deactivate the account instead",
        },
        { status: 409 },
      );
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Student delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 },
    );
  }
}
