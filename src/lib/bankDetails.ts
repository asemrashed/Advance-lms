export type BankDetails = {
  accountHolderName?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  routingNumber?: string;
};

export const BANK_DETAIL_KEYS = [
  "accountHolderName",
  "bankName",
  "branchName",
  "accountNumber",
  "routingNumber",
] as const;

export type BankDetailKey = (typeof BANK_DETAIL_KEYS)[number];

/** Required for profile completion / payout readiness. */
const REQUIRED_BANK_KEYS: BankDetailKey[] = [
  "accountHolderName",
  "bankName",
  "accountNumber",
];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeBankDetails(
  raw: unknown,
): BankDetails | undefined {
  if (!isPlainObject(raw)) return undefined;
  const next: BankDetails = {};
  for (const key of BANK_DETAIL_KEYS) {
    const v = raw[key];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed) next[key] = trimmed;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function hasCompleteBankDetails(raw: unknown): boolean {
  const details = normalizeBankDetails(raw);
  if (!details) return false;
  return REQUIRED_BANK_KEYS.every((key) => Boolean(details[key]?.trim()));
}

/** Merge PATCH-style bankDetails onto existing; empty strings clear a field. */
export function mergeBankDetailsUpdate(
  existing: unknown,
  incoming: unknown,
): BankDetails | null {
  if (incoming === null) return null;
  if (!isPlainObject(incoming)) {
    throw new Error("bankDetails must be an object");
  }
  const prev = normalizeBankDetails(existing) ?? {};
  const next: BankDetails = { ...prev };
  for (const key of BANK_DETAIL_KEYS) {
    if (!(key in incoming)) continue;
    const v = incoming[key];
    if (v === null || v === undefined || v === "") {
      delete next[key];
      continue;
    }
    if (typeof v !== "string") {
      throw new Error(`bankDetails.${key} must be a string`);
    }
    const trimmed = v.trim();
    if (!trimmed) {
      delete next[key];
    } else {
      next[key] = trimmed;
    }
  }
  return Object.keys(next).length > 0 ? next : null;
}
