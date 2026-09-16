import type { AppRole } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return fallback;
}

/** When false, the entire device-limit system is disabled. */
export function isDeviceLimitSystemEnabled(): boolean {
  return parseBoolean(process.env.DEVICE_FORCE_LOGOUT, false);
}

export function getDeviceLimitForRole(role: AppRole): number | null {
  if (!isDeviceLimitSystemEnabled()) return null;
  if (isAdminAreaRole(role)) return null;

  if (role === "instructor") {
    return parsePositiveInt(process.env.DEVICE_LIMIT_INSTRUCTOR, 3);
  }

  return parsePositiveInt(process.env.DEVICE_LIMIT_STUDENT, 2);
}

export const DEVICE_OTP_TTL_MS = 10 * 60 * 1000;
export const DEVICE_LOGIN_CHALLENGE_TTL_MS = 15 * 60 * 1000;
