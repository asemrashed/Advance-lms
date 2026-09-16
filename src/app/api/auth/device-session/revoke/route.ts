import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { revokeDeviceSession } from "@/lib/deviceSessions";
import { isDeviceLimitSystemEnabled } from "@/lib/deviceSessionConfig";

export async function POST(request: NextRequest) {
  try {
    if (!isDeviceLimitSystemEnabled()) {
      return NextResponse.json({ ok: true });
    }

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

    const sessionId = token?.sessionId as string | undefined;
    if (!sessionId) {
      return NextResponse.json({ ok: true });
    }

    await revokeDeviceSession(sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Device session revoke error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
