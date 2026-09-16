import { createHash, randomBytes, randomInt } from "crypto";
import { randomUUID } from "crypto";
import type { AppRole } from "@/app/api/_lib/phase12";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import UserDeviceSession from "@/models/UserDeviceSession";
import DeviceLoginChallenge from "@/models/DeviceLoginChallenge";
import { isAdminAreaRole } from "@/lib/roles";
import {
  DEVICE_LOGIN_CHALLENGE_TTL_MS,
  DEVICE_OTP_TTL_MS,
  getDeviceLimitForRole,
  isDeviceLimitSystemEnabled,
} from "@/lib/deviceSessionConfig";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

export function parseDeviceLabel(userAgent: string): string {
  const ua = userAgent.trim();
  if (!ua) return "Unknown device";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux PC";
  return "Web browser";
}

export async function countActiveDeviceSessions(userId: string): Promise<number> {
  await connectDB();
  return UserDeviceSession.countDocuments({
    userId,
    revokedAt: null,
  });
}

export async function getOldestActiveSession(userId: string) {
  await connectDB();
  return UserDeviceSession.findOne({
    userId,
    revokedAt: null,
  })
    .sort({ createdAt: 1 })
    .lean();
}

export async function revokeDeviceSession(sessionId: string) {
  await connectDB();
  await UserDeviceSession.updateOne(
    { sessionId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function createDeviceSession(options: {
  userId: string;
  deviceId: string;
  deviceLabel: string;
  userAgent: string;
}) {
  await connectDB();
  const sessionId = randomUUID();
  await UserDeviceSession.create({
    userId: options.userId,
    sessionId,
    deviceId: options.deviceId,
    deviceLabel: options.deviceLabel,
    userAgent: options.userAgent,
    lastActiveAt: new Date(),
    revokedAt: null,
  });
  return sessionId;
}

export async function touchDeviceSession(sessionId: string) {
  await connectDB();
  await UserDeviceSession.updateOne(
    { sessionId, revokedAt: null },
    { $set: { lastActiveAt: new Date() } },
  );
}

export async function validateDeviceSession(
  userId: string,
  sessionId: string | undefined,
  sessionVersion: number | undefined,
): Promise<boolean> {
  if (!isDeviceLimitSystemEnabled()) return true;
  // Sessions created before device tracking, or while limits were disabled, must re-login.
  if (!sessionId) return false;

  await connectDB();
  const user = await User.findById(userId).select("sessionVersion role").lean();
  if (!user) return false;

  if (isAdminAreaRole(user.role)) return true;

  const currentVersion = user.sessionVersion ?? 0;
  if ((sessionVersion ?? 0) !== currentVersion) return false;

  const session = await UserDeviceSession.findOne({
    userId,
    sessionId,
    revokedAt: null,
  }).lean();

  return !!session;
}

export type DeviceLimitCheckResult =
  | { allowed: true; limit: number | null }
  | {
      allowed: false;
      reason: "device_limit";
      limit: number;
      oldestDevice: {
        sessionId: string;
        deviceLabel: string;
        loggedInAt: string;
      };
    };

export async function checkDeviceLimitForUser(
  userId: string,
  role: AppRole,
  deviceId: string,
): Promise<DeviceLimitCheckResult> {
  const limit = getDeviceLimitForRole(role);
  if (limit === null) {
    return { allowed: true, limit: null };
  }

  await connectDB();

  const existingOnDevice = await UserDeviceSession.findOne({
    userId,
    deviceId,
    revokedAt: null,
  }).lean();

  if (existingOnDevice) {
    return { allowed: true, limit };
  }

  const activeCount = await countActiveDeviceSessions(userId);
  if (activeCount < limit) {
    return { allowed: true, limit };
  }

  const oldest = await getOldestActiveSession(userId);
  if (!oldest) {
    return { allowed: true, limit };
  }

  return {
    allowed: false,
    reason: "device_limit",
    limit,
    oldestDevice: {
      sessionId: oldest.sessionId,
      deviceLabel: oldest.deviceLabel,
      loggedInAt: oldest.createdAt.toISOString(),
    },
  };
}

export async function createDeviceLoginChallenge(options: {
  userId: string;
  targetSessionId: string;
  deviceId: string;
  deviceLabel: string;
  userAgent: string;
}) {
  await connectDB();

  await DeviceLoginChallenge.deleteMany({
    userId: options.userId,
    verified: false,
  });

  const loginToken = randomBytes(32).toString("hex");
  const otp = generateOtp();

  await DeviceLoginChallenge.create({
    userId: options.userId,
    tokenHash: hashToken(loginToken),
    otpHash: hashToken(otp),
    otpExpires: new Date(Date.now() + DEVICE_OTP_TTL_MS),
    targetSessionId: options.targetSessionId,
    deviceId: options.deviceId,
    deviceLabel: options.deviceLabel,
    userAgent: options.userAgent,
    verified: false,
    expiresAt: new Date(Date.now() + DEVICE_LOGIN_CHALLENGE_TTL_MS),
  });

  return { loginToken, otp };
}

export async function verifyDeviceLoginOtp(loginToken: string, otp: string) {
  await connectDB();
  const tokenHash = hashToken(loginToken);
  const otpHash = hashToken(otp.trim());

  const challenge = await DeviceLoginChallenge.findOne({ tokenHash })
    .select("+otpHash +otpExpires")
    .lean();

  if (!challenge || challenge.verified) {
    return { ok: false as const, error: "Invalid or expired verification." };
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    await DeviceLoginChallenge.deleteOne({ _id: challenge._id });
    return { ok: false as const, error: "Verification expired. Please try again." };
  }

  if (
    challenge.otpExpires.getTime() < Date.now() ||
    challenge.otpHash !== otpHash
  ) {
    return { ok: false as const, error: "Incorrect OTP. Please try again." };
  }

  await DeviceLoginChallenge.updateOne(
    { _id: challenge._id },
    { $set: { verified: true } },
  );

  return { ok: true as const, challenge };
}

export async function consumeVerifiedDeviceLoginChallenge(
  loginToken: string,
  userId: string,
) {
  await connectDB();
  const tokenHash = hashToken(loginToken);

  const challenge = await DeviceLoginChallenge.findOne({
    tokenHash,
    userId,
    verified: true,
  }).lean();

  if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
    return null;
  }

  await revokeDeviceSession(challenge.targetSessionId);
  await bumpUserSessionVersion(userId);
  await DeviceLoginChallenge.deleteOne({ _id: challenge._id });

  return challenge;
}

export async function upsertDeviceSessionForLogin(options: {
  userId: string;
  deviceId: string;
  deviceLabel: string;
  userAgent: string;
}) {
  await connectDB();

  const existing = await UserDeviceSession.findOne({
    userId: options.userId,
    deviceId: options.deviceId,
    revokedAt: null,
  });

  if (existing) {
    existing.deviceLabel = options.deviceLabel;
    existing.userAgent = options.userAgent;
    existing.lastActiveAt = new Date();
    await existing.save();
    return existing.sessionId;
  }

  return createDeviceSession(options);
}

export async function bumpUserSessionVersion(userId: string) {
  await connectDB();
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { sessionVersion: 1 } },
    { new: true },
  )
    .select("sessionVersion")
    .lean();

  return user?.sessionVersion ?? 0;
}
