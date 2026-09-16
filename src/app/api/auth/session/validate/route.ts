import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { validateDeviceSession } from "@/lib/deviceSessions";
import { isDeviceLimitSystemEnabled } from "@/lib/deviceSessionConfig";
import { isAdminAreaRole } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const configuredUrl = (process.env.NEXTAUTH_URL || "").trim();
    const forwarded = request.headers.get("x-forwarded-proto");
    const secureCookie =
      configuredUrl.startsWith("https://") ||
      forwarded?.split(",")[0]?.trim() === "https" ||
      request.nextUrl.protocol === "https:";

    const token = await getToken({
      req: request,
      secret: (process.env.NEXTAUTH_SECRET || "").trim() || undefined,
      secureCookie,
    });

    if (!token?.sub) {
      return NextResponse.json({ valid: false });
    }

    if (token.sessionInvalid === true) {
      return NextResponse.json({ valid: false });
    }

    if (!isDeviceLimitSystemEnabled() || isAdminAreaRole(String(token.role || ""))) {
      return NextResponse.json({ valid: true });
    }

    if (!token.sessionId) {
      return NextResponse.json({ valid: false });
    }

    await connectDB();
    const valid = await validateDeviceSession(
      token.sub,
      token.sessionId as string,
      token.sessionVersion as number | undefined,
    );

    return NextResponse.json({ valid });
  } catch (error) {
    console.error("Session validate error:", error);
    return NextResponse.json({ valid: true, degraded: true }, { status: 503 });
  }
}
