import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sendPasswordResetEmail } from "@/lib/mail";
import { canUserLogin } from "@/lib/accountStatus";
import { getDisplayName } from "@/lib/displayName";

const GENERIC_MESSAGE =
  "If an account exists for that email, we sent a password reset link.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body?.email || ""));

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findOne({ email });
    if (
      user &&
      canUserLogin({
        accountStatus: user.accountStatus,
        isActive: user.isActive,
        role: user.role,
      })
    ) {
      const resetToken = randomBytes(32).toString("hex");
      const hashedToken = createHash("sha256").update(resetToken).digest("hex");

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: getDisplayName(user),
          resetToken,
        });
      } catch (mailError) {
        console.error("Password reset email failed:", mailError);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        return NextResponse.json(
          { error: "Unable to send reset email. Please try again later." },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
