import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import User from "@/models/User";

export async function POST(req: Request) {
  const auth = await requireSessionUser();
  if (auth.error) return auth.error;

  try {
    const userId = auth.user!.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 400 });
    }

    const body = (await req.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    };

    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;
    const confirmPassword = body.confirmPassword;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        { success: false, error: "currentPassword, newPassword, and confirmPassword are required" },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "New password and confirmation do not match" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    await user.save({ validateBeforeSave: true });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (e) {
    console.error("[account/change-password] POST", e);
    return NextResponse.json({ success: false, error: "Failed to update password" }, { status: 500 });
  }
}
