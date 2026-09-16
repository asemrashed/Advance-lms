import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { canUserLogin } from "@/lib/accountStatus";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { getDisplayName } from "@/lib/displayName";
import { sendDeviceForceLogoutOtpEmail } from "@/lib/mail";
import {
  checkDeviceLimitForUser,
  createDeviceLoginChallenge,
  parseDeviceLabel,
} from "@/lib/deviceSessions";
import { isDeviceLimitSystemEnabled } from "@/lib/deviceSessionConfig";
import type { AppRole } from "@/app/api/_lib/phase12";

export async function POST(request: NextRequest) {
  try {
    if (!isDeviceLimitSystemEnabled()) {
      return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
    }

    const body = await request.json();
    const email = normalizeEmail(String(body?.email || ""));
    const password = String(body?.password || "");
    const deviceId = String(body?.deviceId || "").trim();
    const userAgent = String(body?.userAgent || "").trim();

    if (!isValidEmail(email) || !password || !deviceId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const userId = user._id.toString();
    const role = user.role as AppRole;
    const limitCheck = await checkDeviceLimitForUser(userId, role, deviceId);

    if (limitCheck.allowed) {
      return NextResponse.json(
        { error: "Device limit not reached." },
        { status: 400 },
      );
    }

    const deviceLabel = parseDeviceLabel(userAgent);
    const { loginToken, otp } = await createDeviceLoginChallenge({
      userId,
      targetSessionId: limitCheck.oldestDevice.sessionId,
      deviceId,
      deviceLabel,
      userAgent,
    });

    try {
      await sendDeviceForceLogoutOtpEmail({
        to: user.email,
        name: getDisplayName(user),
        otp,
        deviceLabel,
      });
    } catch (mailError) {
      console.error("Device force logout OTP email failed:", mailError);
      return NextResponse.json(
        { error: "Unable to send verification email. Please try again later." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      message: "Verification code sent to your email.",
      loginToken,
      oldestDevice: limitCheck.oldestDevice,
    });
  } catch (error) {
    console.error("Device limit request OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
