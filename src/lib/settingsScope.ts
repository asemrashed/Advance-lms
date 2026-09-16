/**
 * Settings vs profile boundary: only these keys may live in the Settings collection
 * for student / instructor blobs. Identity and profile fields belong to User (Phase 13.3).
 */

/** Admin platform document top-level buckets (mirrors API allowlist). */
export const ADMIN_PLATFORM_CATEGORY_KEYS = [
  "system",
  "security",
  "notifications",
  "database",
  "email",
  "payment",
] as const;

export const STUDENT_SETTINGS_ALLOWED_KEYS = new Set<string>([
  "profileVisibility",
  "interests",
  "learningGoals",
  "allowInstructorMessages",
  "showProgress",
  "preferredEmail",
  "emailSignature",
  "courseNotifications",
  "assignmentNotifications",
  "emailNotifications",
  "reminderNotifications",
]);

export const INSTRUCTOR_SETTINGS_ALLOWED_KEYS = new Set<string>([
  "profileVisibility",
  "allowStudentMessages",
  "showContactInfo",
  "preferredEmail",
  "emailSignature",
  "courseNotifications",
  "studentNotifications",
  "emailNotifications",
  // Payout reporting/preferences only — never initiates fund transfers.
  "payoutMethod",
  "payoutAccountMasked",
  "payoutFrequency",
  "payoutThreshold",
  "nextPayoutDate",
]);

export function isPlainSettingsObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function pickStudentSettingsForStorage(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of STUDENT_SETTINGS_ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      out[key] = input[key];
    }
  }
  return out;
}

export function pickInstructorSettingsForStorage(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of INSTRUCTOR_SETTINGS_ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      out[key] = input[key];
    }
  }
  return out;
}

/** Deep-merge plain objects; non-objects overwrite. */
export function deepMergePlainObjects(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    if (isPlainSettingsObject(bv) && isPlainSettingsObject(pv)) {
      out[key] = deepMergePlainObjects(bv, pv);
    } else {
      out[key] = pv;
    }
  }
  return out;
}

/** Merge admin PUT payload into existing platform doc without wiping omitted categories. */
export function mergeAdminPlatformPayload(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  categoryKeys: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of categoryKeys) {
    const prev = isPlainSettingsObject(current[key])
      ? { ...(current[key] as Record<string, unknown>) }
      : {};
    const inc = incoming[key];
    if (inc === undefined) {
      result[key] = prev;
    } else if (isPlainSettingsObject(inc)) {
      result[key] = deepMergePlainObjects(prev, inc);
    } else {
      result[key] = prev;
    }
  }
  return result;
}
