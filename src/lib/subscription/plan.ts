export type BillingPlan = "monthly" | "full";

/** Extra access days after the paid calendar month ends (e.g. July → until 15 Aug). */
export const MONTHLY_GRACE_DAYS = 15;

/** Staff-granted extension when a student needs more time to pay. */
export const INSTRUCTOR_GRACE_DAYS = 7;

/** Initial pay-by deadline for a student who joins a running (live) course. */
export const RUNNING_COURSE_PAYMENT_WINDOW_MONTHS = 1;

export function normalizeBillingPlan(value: unknown): BillingPlan {
  return value === "monthly" ? "monthly" : "full";
}

/** Adds one calendar month to a date. */
export function addOneMonth(from: Date): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

/** Last moment of the calendar month containing `from`. */
export function endOfMonth(from: Date): Date {
  return new Date(
    from.getFullYear(),
    from.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

/**
 * Access cut-off after a paid calendar month (month end + grace days).
 */
export function graceEndFromPaidMonthEnd(paidMonthEnd: Date): Date {
  const graceEnd = addDays(paidMonthEnd, MONTHLY_GRACE_DAYS);
  graceEnd.setHours(23, 59, 59, 999);
  return graceEnd;
}

/**
 * From `accessExpiresAt`, recover the end of the paid calendar month.
 *
 * New model: expiry ≈ paid month end + {@link MONTHLY_GRACE_DAYS} (usually the 15th).
 * Legacy model: expiry ≈ paymentDate + 1 calendar month (often day 25–29 next month).
 */
export function paidMonthEndFromExpiry(accessExpiresAt: Date): Date {
  const day = accessExpiresAt.getDate();
  // New model lands near the 15th; allow a small window for TZ / rounding.
  if (day >= 13 && day <= 17) {
    const approx = addDays(accessExpiresAt, -MONTHLY_GRACE_DAYS);
    return endOfMonth(approx);
  }
  // Legacy: paid month is the calendar month before the expiry's month.
  return endOfMonth(
    new Date(accessExpiresAt.getFullYear(), accessExpiresAt.getMonth() - 1, 1),
  );
}

/** Legacy expiries (payment + 1 month) should be rewritten to month-end + grace. */
export function needsAccessExpiryNormalization(accessExpiresAt: Date): boolean {
  const day = accessExpiresAt.getDate();
  return day < 13 || day > 17;
}

/**
 * Access window end for a plan.
 *
 * Monthly: access for the paid calendar month + {@link MONTHLY_GRACE_DAYS}.
 * - First payment / after expiry → pay for the current calendar month
 *   (July pay → access until 15 Aug).
 * - Renewal while still active → pay for the next month after the one already covered
 *   (renew in early Aug while grace remains → access until 15 Sep).
 * Full: no expiry.
 */
export function computeAccessExpiry(
  plan: BillingPlan,
  currentExpiry?: Date | null,
  now: Date = new Date(),
): Date | undefined {
  if (plan !== "monthly") return undefined;

  let monthInPaidPeriod: Date;

  if (currentExpiry && currentExpiry.getTime() > now.getTime()) {
    const currentPaidMonthEnd = paidMonthEndFromExpiry(currentExpiry);
    // Next unpaid calendar month
    monthInPaidPeriod = new Date(
      currentPaidMonthEnd.getFullYear(),
      currentPaidMonthEnd.getMonth() + 1,
      1,
      12,
      0,
      0,
      0,
    );
  } else {
    monthInPaidPeriod = now;
  }

  return graceEndFromPaidMonthEnd(endOfMonth(monthInPaidPeriod));
}

type AccessFields = {
  paymentStatus?: string | null;
  billingPlan?: BillingPlan | string | null;
  accessExpiresAt?: Date | string | null;
  accessBlocked?: boolean | null;
  paymentDueAt?: Date | string | null;
};

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Pay-by deadline when a student joins a running live course unpaid. */
export function computeRunningCoursePaymentDue(from: Date = new Date()): Date {
  const due = addOneMonth(from);
  due.setHours(23, 59, 59, 999);
  return due;
}

/**
 * Unpaid students who still have an open `paymentDueAt` (the 1-month running-course
 * window, or a later staff-granted deadline) keep access until that date.
 */
export function isWithinUnpaidAccessWindow(
  fields: AccessFields,
  now: Date = new Date(),
): boolean {
  if (fields.accessBlocked) return false;
  if (String(fields.paymentStatus || "").toLowerCase() === "paid") return false;
  const due = toDate(fields.paymentDueAt);
  return Boolean(due && due.getTime() > now.getTime());
}

/**
 * Paid subscription or an unpaid running-course payment window that has not expired.
 */
export function enrollmentGrantsAccess(
  fields: AccessFields,
  now: Date = new Date(),
): boolean {
  if (fields.accessBlocked) return false;
  if (String(fields.paymentStatus || "").toLowerCase() === "paid") {
    return isSubscriptionActive(fields, now);
  }
  return isWithinUnpaidAccessWindow(fields, now);
}

/** Mongo clause: paid enrollments plus unpaid rows still inside the pay window. */
export function accessGrantingPaymentQuery(now: Date = new Date()) {
  return {
    $or: [
      { paymentStatus: "paid" },
      { paymentStatus: "pending", paymentDueAt: { $gt: now } },
    ],
  };
}

/**
 * Whether a paid enrollment currently grants access, considering staff block,
 * monthly expiry (+15 day grace baked into accessExpiresAt), and any
 * staff-granted deadline (`paymentDueAt`, typically +7 days).
 */
export function isSubscriptionActive(
  fields: AccessFields,
  now: Date = new Date(),
): boolean {
  if (fields.accessBlocked) return false;

  const plan = normalizeBillingPlan(fields.billingPlan);
  if (plan === "full") return true;

  const expiry = toDate(fields.accessExpiresAt);
  if (expiry && expiry.getTime() > now.getTime()) return true;

  const grace = toDate(fields.paymentDueAt);
  if (grace && grace.getTime() > now.getTime()) return true;

  // Monthly plan with no expiry set yet (freshly activated) is treated active.
  if (!expiry && !grace) return true;

  return false;
}

/**
 * True when the paid calendar month is over — student should renew.
 * Covers the 15-day warning window and after access is blocked.
 */
export function isMonthlyDue(
  fields: AccessFields,
  now: Date = new Date(),
): boolean {
  if (normalizeBillingPlan(fields.billingPlan) !== "monthly") return false;
  const expiry = toDate(fields.accessExpiresAt);
  if (!expiry) return false;
  const paidMonthEnd = paidMonthEndFromExpiry(expiry);
  return now.getTime() >= paidMonthEnd.getTime();
}

/** In the 15-day extension after the paid month (still has access, should pay). */
export function isInMonthlyWarningWindow(
  fields: AccessFields,
  now: Date = new Date(),
): boolean {
  if (!isMonthlyDue(fields, now)) return false;
  const expiry = toDate(fields.accessExpiresAt);
  if (!expiry) return false;
  return now.getTime() < expiry.getTime();
}

/** Period key for idempotent renewal notices (month the student should pay for). */
export function renewalPeriodKey(
  fields: AccessFields,
  now: Date = new Date(),
): string | null {
  const expiry = toDate(fields.accessExpiresAt);
  if (!expiry) return null;
  const paidMonthEnd = paidMonthEndFromExpiry(expiry);
  // The due month is the calendar month after the one already paid.
  const dueMonth = new Date(
    paidMonthEnd.getFullYear(),
    paidMonthEnd.getMonth() + 1,
    1,
  );
  // If already past grace entirely, still key by the month they owe (or current).
  if (now.getTime() >= expiry.getTime()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  const y = dueMonth.getFullYear();
  const m = String(dueMonth.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
