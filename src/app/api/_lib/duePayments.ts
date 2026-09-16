import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import {
  graceEndFromPaidMonthEnd,
  isInMonthlyWarningWindow,
  isMonthlyDue,
  needsAccessExpiryNormalization,
  paidMonthEndFromExpiry,
  renewalPeriodKey,
} from "@/lib/subscription/plan";
import {
  resolveCourseAmountForPlan,
  resolveBatchAmountForPlan,
  coursePricingFromLean,
} from "@/lib/courses/liveCoursePricing";
import {
  approvedPricingKey,
  loadActiveApprovedPricingMap,
  resolveAmountWithApprovedPricing,
  resolveBatchAmountForStudent,
} from "@/lib/courses/studentPricing";
import { ensureMonthlyRenewalNotices } from "@/app/api/_lib/paymentRenewalNotices";

type EnrollmentQueryModel = {
  find: (filter: Record<string, unknown>) => ReturnType<typeof Enrollment.find>;
};
const EnrollmentModel = Enrollment as unknown as EnrollmentQueryModel;

type BatchEnrollmentQueryModel = {
  find: (filter: Record<string, unknown>) => ReturnType<typeof BatchEnrollment.find>;
};
const BatchEnrollmentModel = BatchEnrollment as unknown as BatchEnrollmentQueryModel;

export type PayableItem = {
  kind: "course" | "batch";
  id: string;
  title: string;
  billingPlan: "monthly" | "full";
  amount: number;
  /** List price before student discount. */
  originalAmount?: number;
  discountApplied?: boolean;
  accessExpiresAt?: string;
  /** Pay-by deadline for unpaid running-course enrollments. */
  paymentDueAt?: string;
  /** End of the paid calendar month (when the 15-day warning starts). */
  paidMonthEndedAt?: string;
  /**
   * grace = month over, still has 15-day access (warning).
   * expired = 15-day window ended (access blocked unless staff grace).
   */
  phase?: "grace" | "expired";
  reason: "renewal" | "pending";
};

export type DuePaymentsResult = {
  due: PayableItem[];
  payable: PayableItem[];
};

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Rewrite legacy `paymentDate + 1 month` expiries to calendar-month + 15 days
 * so July enrollments enter the August warning window correctly.
 */
async function normalizeLegacyMonthlyExpiry(
  kind: "course" | "batch",
  row: {
    _id?: unknown;
    billingPlan?: string;
    paymentStatus?: string;
    accessExpiresAt?: unknown;
  },
): Promise<Date | null> {
  const expiry = asDate(row.accessExpiresAt);
  if (
    !expiry ||
    row.billingPlan !== "monthly" ||
    row.paymentStatus !== "paid" ||
    !needsAccessExpiryNormalization(expiry)
  ) {
    return expiry;
  }

  const canonical = graceEndFromPaidMonthEnd(paidMonthEndFromExpiry(expiry));
  if (Math.abs(canonical.getTime() - expiry.getTime()) < 12 * 60 * 60 * 1000) {
    return expiry;
  }

  const id = row._id;
  if (id) {
    if (kind === "course") {
      await Enrollment.updateOne(
        { _id: id },
        { $set: { accessExpiresAt: canonical } },
      ).catch((err) => console.error("normalize course accessExpiresAt", err));
    } else {
      await BatchEnrollment.updateOne(
        { _id: id },
        { $set: { accessExpiresAt: canonical } },
      ).catch((err) => console.error("normalize batch accessExpiresAt", err));
    }
  }
  row.accessExpiresAt = canonical;
  return canonical;
}

function renewalMeta(
  row: {
    accessExpiresAt?: unknown;
    billingPlan?: string;
    accessBlocked?: boolean;
    paymentDueAt?: unknown;
  },
  now: Date,
): Pick<PayableItem, "paidMonthEndedAt" | "phase" | "accessExpiresAt"> {
  const expiry = asDate(row.accessExpiresAt);
  const paidEnd = expiry ? paidMonthEndFromExpiry(expiry) : null;
  const inWarning = isInMonthlyWarningWindow(
    {
      billingPlan: row.billingPlan,
      accessExpiresAt: expiry,
      accessBlocked: row.accessBlocked,
      paymentDueAt: asDate(row.paymentDueAt),
    },
    now,
  );
  return {
    accessExpiresAt: expiry ? expiry.toISOString() : undefined,
    paidMonthEndedAt: paidEnd ? paidEnd.toISOString() : undefined,
    phase: inWarning ? "grace" : "expired",
  };
}

/**
 * Derives monthly renewals that are due and pending (unpaid) enrollments the
 * student can pay for. Dues are computed on the fly (no stored installments).
 * Also ensures an in-app renewal notice exists for each grace-period item.
 */
export async function computeDuePayments(
  studentId: string,
): Promise<DuePaymentsResult> {
  const now = new Date();

  const [courseRows, batchRows] = await Promise.all([
    EnrollmentModel.find({ student: studentId })
      .select(
        "_id course status paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt",
      )
      .lean(),
    BatchEnrollmentModel.find({ studentId })
      .select(
        "_id batchId status paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt",
      )
      .lean(),
  ]);

  // Align legacy expiries before due / notice evaluation.
  await Promise.all([
    ...courseRows.map((row) => normalizeLegacyMonthlyExpiry("course", row)),
    ...batchRows.map((row) => normalizeLegacyMonthlyExpiry("batch", row)),
  ]);

  const courseIds = courseRows.map((r) => r.course);
  const batchIds = batchRows.map((r) => r.batchId);

  const [courses, batches] = await Promise.all([
    Course.find({ _id: { $in: courseIds } })
      .select("title isPaid price salePrice monthlyPrice")
      .lean(),
    Batch.find({ _id: { $in: batchIds } })
      .select("name monthlyFee courseId")
      .lean(),
  ]);

  const courseMap = new Map(courses.map((c) => [String(c._id), c]));
  const batchMap = new Map(batches.map((b) => [String(b._id), b]));

  const parentCourseIds = batches.map((b) => b.courseId).filter(Boolean);
  const parentCourses = parentCourseIds.length
    ? await Course.find({ _id: { $in: parentCourseIds } })
        .select("isPaid price salePrice monthlyPrice")
        .lean()
    : [];
  const parentMap = new Map(parentCourses.map((c) => [String(c._id), c]));

  const pricingMap = await loadActiveApprovedPricingMap(studentId);

  const due: PayableItem[] = [];
  const payable: PayableItem[] = [];
  const noticeCandidates: {
    kind: "course" | "batch";
    id: string;
    title: string;
    periodKey: string;
    warningUntil?: string;
    phase: "grace" | "expired";
  }[] = [];

  for (const row of courseRows) {
    const course = courseMap.get(String(row.course));
    if (!course) continue;
    const plan = row.billingPlan === "monthly" ? "monthly" : "full";
    const title = String(course.title || "Course");

    if (row.paymentStatus === "pending") {
      const pricingInput = {
        isPaid: course.isPaid,
        price: course.price,
        salePrice: course.salePrice,
        monthlyPrice: (course as { monthlyPrice?: number }).monthlyPrice,
      };
      const listAmount = resolveCourseAmountForPlan(pricingInput, plan);
      const approved =
        pricingMap.get(approvedPricingKey(String(row.course), plan)) ?? null;
      const pricing = resolveAmountWithApprovedPricing(listAmount, approved);
      payable.push({
        kind: "course",
        id: String(row.course),
        title,
        billingPlan: plan,
        amount: pricing.finalAmount,
        originalAmount: pricing.discountApplied ? pricing.listAmount : undefined,
        discountApplied: pricing.discountApplied,
        paymentDueAt: asDate(row.paymentDueAt)?.toISOString(),
        reason: "pending",
      });
      continue;
    }

    if (row.paymentStatus === "paid" && plan === "monthly" && isMonthlyDue(row, now)) {
      const meta = renewalMeta(row, now);
      const pricingInput = {
        isPaid: course.isPaid,
        price: course.price,
        salePrice: course.salePrice,
        monthlyPrice: (course as { monthlyPrice?: number }).monthlyPrice,
      };
      const listAmount = resolveCourseAmountForPlan(pricingInput, "monthly");
      const approved =
        pricingMap.get(approvedPricingKey(String(row.course), "monthly")) ?? null;
      const pricing = resolveAmountWithApprovedPricing(listAmount, approved);
      const item: PayableItem = {
        kind: "course",
        id: String(row.course),
        title,
        billingPlan: "monthly",
        amount: pricing.finalAmount,
        originalAmount: pricing.discountApplied ? pricing.listAmount : undefined,
        discountApplied: pricing.discountApplied,
        ...meta,
        reason: "renewal",
      };
      due.push(item);
      payable.push(item);
      const periodKey = renewalPeriodKey(row, now);
      if (periodKey) {
        noticeCandidates.push({
          kind: "course",
          id: item.id,
          title,
          periodKey,
          warningUntil: meta.accessExpiresAt,
          phase: meta.phase || "expired",
        });
      }
    }
  }

  for (const row of batchRows) {
    const batch = batchMap.get(String(row.batchId));
    if (!batch) continue;
    const plan = row.billingPlan === "monthly" ? "monthly" : "full";
    const title = String(batch.name || "Batch");
    const parent = batch.courseId
      ? parentMap.get(String(batch.courseId))
      : null;
    const parentPricing = parent ? coursePricingFromLean(parent) : null;

    if (row.paymentStatus === "pending") {
      const pricing = await resolveBatchAmountForStudent(
        batch,
        parentPricing,
        plan,
        studentId,
        pricingMap,
      );
      payable.push({
        kind: "batch",
        id: String(row.batchId),
        title,
        billingPlan: plan,
        amount: pricing.finalAmount,
        originalAmount: pricing.discountApplied ? pricing.listAmount : undefined,
        discountApplied: pricing.discountApplied,
        paymentDueAt: asDate(row.paymentDueAt)?.toISOString(),
        reason: "pending",
      });
      continue;
    }

    if (row.paymentStatus === "paid" && plan === "monthly" && isMonthlyDue(row, now)) {
      const meta = renewalMeta(row, now);
      const pricing = await resolveBatchAmountForStudent(
        batch,
        parentPricing,
        "monthly",
        studentId,
        pricingMap,
      );
      const item: PayableItem = {
        kind: "batch",
        id: String(row.batchId),
        title,
        billingPlan: "monthly",
        amount: pricing.finalAmount,
        originalAmount: pricing.discountApplied ? pricing.listAmount : undefined,
        discountApplied: pricing.discountApplied,
        ...meta,
        reason: "renewal",
      };
      due.push(item);
      payable.push(item);
      const periodKey = renewalPeriodKey(row, now);
      if (periodKey) {
        noticeCandidates.push({
          kind: "batch",
          id: item.id,
          title,
          periodKey,
          warningUntil: meta.accessExpiresAt,
          phase: meta.phase || "expired",
        });
      }
    }
  }

  // Fire-and-forget style but awaited so notice exists when UI loads notifications.
  await ensureMonthlyRenewalNotices(studentId, noticeCandidates).catch((err) => {
    console.error("ensureMonthlyRenewalNotices", err);
  });

  return { due, payable };
}
