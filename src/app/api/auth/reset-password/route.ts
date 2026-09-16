import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");
    const confirmPassword = String(body?.confirmPassword || "");

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Password and confirm password do not match" },
        { status: 400 },
      );
    }

    await connectDB();

    const hashedToken = createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 },
      );
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return NextResponse.json({
      message: "Password updated successfully. You can sign in now.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
