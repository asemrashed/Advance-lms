import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { canUserLogin } from "@/lib/accountStatus";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import {
  checkDeviceLimitForUser,
  parseDeviceLabel,
} from "@/lib/deviceSessions";
import { isDeviceLimitSystemEnabled } from "@/lib/deviceSessionConfig";
import type { AppRole } from "@/app/api/_lib/phase12";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body?.email || ""));
    const password = String(body?.password || "");
    const deviceId = String(body?.deviceId || "").trim();
    const userAgent = String(body?.userAgent || "").trim();

    if (!isValidEmail(email) || !password) {
      return NextResponse.json(
        { allowed: false, reason: "invalid_credentials" },
        { status: 401 },
      );
    }

    if (isDeviceLimitSystemEnabled() && !deviceId) {
      return NextResponse.json(
        { error: "Device identifier is required." },
        { status: 400 },
      );
    }

    await connectDB();
    const user = await User.findOne({ email });

    if (
      !user ||
      !canUserLogin({
        accountStatus: user.accountStatus,
        isActive: user.isActive,
        role: user.role,
      })
    ) {
      return NextResponse.json(
        { allowed: false, reason: "invalid_credentials" },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { allowed: false, reason: "invalid_credentials" },
        { status: 401 },
      );
    }

    if (!isDeviceLimitSystemEnabled()) {
      return NextResponse.json({ allowed: true, limit: null });
    }

    const role = user.role as AppRole;
    const limitCheck = await checkDeviceLimitForUser(
      user._id.toString(),
      role,
      deviceId,
    );

    if (limitCheck.allowed) {
      return NextResponse.json({
        allowed: true,
        limit: limitCheck.limit,
      });
    }

    return NextResponse.json({
      allowed: false,
      reason: "device_limit",
      limit: limitCheck.limit,
      oldestDevice: limitCheck.oldestDevice,
      currentDeviceLabel: parseDeviceLabel(userAgent),
    });
  } catch (error) {
    console.error("Device limit check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
