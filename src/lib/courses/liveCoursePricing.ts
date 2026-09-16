export type CoursePricingInput = {
  isPaid?: boolean;
  price?: number;
  salePrice?: number;
  monthlyPrice?: number;
};
 
/**
 * Canonical course price used by public APIs and enrollment/payment.
 * `salePrice` applies only when it is a positive discount below `price`.
 */
export function resolveCourseFinalPrice(course: CoursePricingInput): number {
  if (!course.isPaid) return 0;
  const price = Number(course.price) || 0;
  const salePrice = course.salePrice;
  if (
    typeof salePrice === "number" &&
    salePrice > 0 &&
    (price <= 0 || salePrice < price)
  ) {
    return salePrice;
  }
  return price;
}

/** Build API pricing fields from course form values. */
export function buildCoursePricingFields(form: {
  isPaid: boolean;
  price: number;
  discountedPrice: number;
}): { isPaid: boolean; price?: number; salePrice?: number | null } {
  if (!form.isPaid) {
    return { isPaid: false, price: undefined, salePrice: null };
  }
  const price = Number(form.price) || 0;
  const discounted = Number(form.discountedPrice) || 0;
  if (discounted > 0 && discounted < price) {
    return { isPaid: true, price, salePrice: discounted };
  }
  return { isPaid: true, price, salePrice: null };
}

export function resolveCourseDiscountPercentage(
  course: CoursePricingInput,
): number {
  if (!course.isPaid) return 0;
  const price = Number(course.price) || 0;
  const salePrice = course.salePrice;
  if (typeof salePrice !== "number" || price <= 0 || salePrice >= price) {
    return 0;
  }
  return Math.round(((price - salePrice) / price) * 100);
}

/** @alias resolveCourseFinalPrice */
export const resolveLiveCoursePrice = resolveCourseFinalPrice;

/**
 * Full batch/course price source — linked course final price.
 * Returns 0 when no course is linked (unpriced standalone batch).
 * Callers must not treat that 0 as "intentionally free" for full-plan enroll.
 */
export function resolveBatchEnrollmentFee(
  _batch: { monthlyFee?: number } | object,
  course?: CoursePricingInput | null,
): number {
  if (course) return resolveCourseFinalPrice(course);
  return 0;
}

/**
 * Whether a resolved fee of 0 may free-enroll as paid.
 * Full plan without a linked course is unpriced — refuse free paid enrollment.
 * Free linked courses (`!isPaid` / price 0) and monthlyFee 0 remain allowed.
 */
export function canFreeEnrollBatchPlan(options: {
  fee: number;
  plan: "monthly" | "full";
  hasLinkedCourse: boolean;
}): boolean {
  if (options.fee > 0) return false;
  if (options.plan === "full" && !options.hasLinkedCourse) return false;
  return true;
}

/** Normalize DB lean fields into pricing input. */
export function coursePricingFromLean(
  row: {
    isPaid?: unknown;
    price?: unknown;
    salePrice?: unknown;
    monthlyPrice?: unknown;
  },
): CoursePricingInput {
  return {
    isPaid: Boolean(row.isPaid),
    price: Number(row.price) || 0,
    salePrice:
      typeof row.salePrice === "number" ? row.salePrice : undefined,
    monthlyPrice:
      typeof row.monthlyPrice === "number" && row.monthlyPrice > 0
        ? row.monthlyPrice
        : undefined,
  };
}

/** Course amount for a billing plan: monthly uses monthlyPrice, full uses final price. */
export function resolveCourseAmountForPlan(
  course: CoursePricingInput & { monthlyPrice?: number },
  plan: "monthly" | "full",
): number {
  if (plan === "monthly") {
    return Math.max(0, Number(course.monthlyPrice) || 0);
  }
  return resolveCourseFinalPrice(course);
}

/** Batch amount for a billing plan: monthly uses batch.monthlyFee, full uses linked course price. */
export function resolveBatchAmountForPlan(
  batch: { monthlyFee?: number },
  course: CoursePricingInput | null | undefined,
  plan: "monthly" | "full",
): number {
  if (plan === "monthly") {
    return Math.max(0, Number(batch.monthlyFee) || 0);
  }
  return resolveBatchEnrollmentFee(batch, course);
}
