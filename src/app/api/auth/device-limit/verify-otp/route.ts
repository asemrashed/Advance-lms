import { NextRequest, NextResponse } from "next/server";
import { verifyDeviceLoginOtp } from "@/lib/deviceSessions";
import { isDeviceLimitSystemEnabled } from "@/lib/deviceSessionConfig";

export async function POST(request: NextRequest) {
  try {
    if (!isDeviceLimitSystemEnabled()) {
      return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
    }

    const body = await request.json();
    const loginToken = String(body?.loginToken || "").trim();
    const otp = String(body?.otp || "").trim();

    if (!loginToken || !otp) {
      return NextResponse.json({ error: "OTP is required." }, { status: 400 });
    }

    const result = await verifyDeviceLoginOtp(loginToken, otp);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      verified: true,
      loginToken,
      message: "Verification successful. You can sign in now.",
    });
  } catch (error) {
    console.error("Device limit verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
