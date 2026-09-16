import Payment from "@/models/Payment";
import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import { approveAccessRequestAfterPayment } from "@/app/api/_lib/platformQuestionAccess";
import { computeAccessExpiry, normalizeBillingPlan } from "@/lib/subscription/plan";

export type PaymentEntityType = "course" | "batch" | "qb_access";
type EnrollmentQueryModel = {
  findOneAndUpdate: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => ReturnType<typeof Enrollment.findOneAndUpdate>;
  findOne: (filter: Record<string, unknown>) => ReturnType<typeof Enrollment.findOne>;
  find: (filter: Record<string, unknown>) => ReturnType<typeof Enrollment.find>;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) => ReturnType<typeof Enrollment.updateOne>;
  countDocuments: (
    filter: Record<string, unknown>,
  ) => ReturnType<typeof Enrollment.countDocuments>;
};
const EnrollmentModel = Enrollment as unknown as EnrollmentQueryModel;

export type PaymentForFulfillment = {
  _id: unknown;
  entityType?: PaymentEntityType | string;
  status?: string;
  transactionId?: string;
  billingPlan?: "monthly" | "full" | string;
  enrollment?: unknown;
  batchEnrollment?: unknown;
  batchId?: unknown;
  course?: unknown;
  qbAccessRequest?: unknown;
  user?: unknown;
  amount?: number;
};

/** Ensure live enrollments retain a section when checkout omitted selectedBatchId. */
async function ensureLiveBatchPlacement(
  enrollmentId: unknown,
  courseId: unknown,
  batchId?: unknown,
  existingSelectedBatchId?: unknown,
): Promise<void> {
  if (existingSelectedBatchId || !courseId) return;

  if (batchId) {
    await EnrollmentModel.updateOne(
      { _id: enrollmentId },
      { $set: { selectedBatchId: batchId } },
    );
    return;
  }

  const course = await Course.findById(courseId).select("courseType").lean();
  if (!course || normalizeCourseType(course.courseType) !== "live") return;

  const fallbackBatch = await Batch.findOne({ courseId })
    .select("_id")
    .sort({ createdAt: 1 })
    .lean();
  if (!fallbackBatch?._id) return;

  await EnrollmentModel.updateOne(
    { _id: enrollmentId },
    { $set: { selectedBatchId: fallbackBatch._id } },
  );
}

/** $set/$unset for activating an enrollment with plan-aware access window. */
function activationUpdate(
  plan: "monthly" | "full",
  currentExpiry: Date | null | undefined,
  activeStatus: "enrolled" | "active",
) {
  const expiry = computeAccessExpiry(plan, currentExpiry ?? null);
  const set: Record<string, unknown> = {
    status: activeStatus,
    paymentStatus: "paid",
    billingPlan: plan,
    accessBlocked: false,
  };
  const unset: Record<string, unknown> = { paymentDueAt: "" };
  if (expiry) {
    set.accessExpiresAt = expiry;
  } else {
    unset.accessExpiresAt = "";
  }
  return { $set: set, $unset: unset };
}

const ACTIVE_ENROLLMENT_STATUSES = ["enrolled", "in_progress", "completed"] as const;

async function linkPaymentToEnrollment(
  payment: PaymentForFulfillment,
  enrollmentId: unknown,
): Promise<void> {
  await Payment.updateOne(
    { _id: payment._id },
    { $set: { enrollment: enrollmentId } },
  );
  payment.enrollment = enrollmentId;
}

/**
 * Ensures a course enrollment row exists for checkout/fulfillment.
 * Never downgrades an already-paid active enrollment (renewals only link).
 */
export async function ensureCourseEnrollmentForPayment(
  payment: PaymentForFulfillment,
): Promise<void> {
  if (!payment.user || !payment.course) return;

  if (payment.enrollment) {
    const linked = await Enrollment.exists({ _id: payment.enrollment });
    if (linked) return;
  }

  const enrollmentFilter: Record<string, unknown> = {
    student: payment.user,
    course: payment.course,
  };

  const existing = (await EnrollmentModel.findOne(enrollmentFilter)
    .select("_id status paymentStatus")
    .lean()) as {
    _id?: unknown;
    status?: string;
    paymentStatus?: string;
  } | null;

  if (existing?._id) {
    const alreadyActivePaid =
      existing.paymentStatus === "paid" &&
      ACTIVE_ENROLLMENT_STATUSES.includes(
        existing.status as (typeof ACTIVE_ENROLLMENT_STATUSES)[number],
      );

    if (alreadyActivePaid) {
      // Renewal / re-link: keep access; do not write suspended/pending.
      await linkPaymentToEnrollment(payment, existing._id);
      return;
    }

    const plan = normalizeBillingPlan(payment.billingPlan);
    const set: Record<string, unknown> = {
      paymentId: payment.transactionId,
      billingPlan: plan,
    };
    if (typeof payment.amount === "number" && payment.amount > 0) {
      set.paymentAmount = payment.amount;
    }
    if (payment.batchId) {
      set.selectedBatchId = payment.batchId;
    }
    // Pending checkout only — leave status alone if already suspended.
    if (existing.paymentStatus !== "pending") {
      set.paymentStatus = "pending";
    }
    if (
      !ACTIVE_ENROLLMENT_STATUSES.includes(
        existing.status as (typeof ACTIVE_ENROLLMENT_STATUSES)[number],
      )
    ) {
      set.status = "suspended";
    }

    await EnrollmentModel.updateOne({ _id: existing._id }, { $set: set });
    await linkPaymentToEnrollment(payment, existing._id);
    return;
  }

  const plan = normalizeBillingPlan(payment.billingPlan);
  const set: Record<string, unknown> = {
    status: "suspended",
    paymentStatus: "pending",
    paymentId: payment.transactionId,
    billingPlan: plan,
  };
  if (typeof payment.amount === "number" && payment.amount > 0) {
    set.paymentAmount = payment.amount;
  }
  if (payment.batchId) {
    set.selectedBatchId = payment.batchId;
  }

  const doc = (await EnrollmentModel.findOneAndUpdate(
    enrollmentFilter,
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )) as { _id?: unknown } | null;

  if (doc?._id) {
    await linkPaymentToEnrollment(payment, doc._id);
  }
}

export async function findCourseEnrollmentForPayment(
  payment: Pick<
    PaymentForFulfillment,
    "enrollment" | "transactionId" | "user" | "course"
  >,
) {
  const filters: Record<string, unknown>[] = [];
  if (payment.enrollment) {
    filters.push({ _id: payment.enrollment });
  }
  if (payment.transactionId) {
    const studentFilter = payment.user ? { student: payment.user } : {};
    filters.push({ ...studentFilter, paymentId: payment.transactionId });
  }
  if (payment.user && payment.course) {
    filters.push({ student: payment.user, course: payment.course });
  }
  if (filters.length === 0) return null;

  return EnrollmentModel.findOne({ $or: filters })
    .select("_id status paymentStatus selectedBatchId")
    .lean();
}

async function fulfillQbAccessPayment(payment: PaymentForFulfillment): Promise<void> {
  if (!payment.qbAccessRequest) return;
  await approveAccessRequestAfterPayment(payment.qbAccessRequest);
}

export async function markPaymentFailed(
  paymentId: unknown,
  gatewayResponse: unknown,
): Promise<void> {
  await Payment.findByIdAndUpdate(paymentId, {
    $set: {
      status: "failed",
      gatewayResponse,
    },
  });
}

/** Idempotent success: activates enrollment(s) for course or batch payments. */
export async function fulfillPaymentSuccess(
  payment: PaymentForFulfillment,
  gatewayResponse: unknown,
): Promise<"already_processed" | "fulfilled"> {
  // Atomic claim: only one concurrent IPN/validate wins. Prevents double monthly extension.
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "success" } },
    {
      $set: {
        status: "success",
        gatewayResponse,
      },
    },
    { new: true },
  );

  if (!claimed) {
    return "already_processed";
  }

  payment.status = "success";

  if (payment.entityType === "qb_access") {
    await fulfillQbAccessPayment(payment);
    return "fulfilled";
  }

  const entityType =
    payment.entityType === "batch" ? "batch" : ("course" as const);
  const plan = normalizeBillingPlan(payment.billingPlan);

  if (entityType === "batch") {
    const filters = [];
    if (payment.batchEnrollment) {
      filters.push({ _id: payment.batchEnrollment });
    }
    if (payment.transactionId) {
      filters.push({ paymentId: payment.transactionId });
    }
    if (filters.length > 0) {
      // Capacity guard for concurrent paid enrollments — don't overfill a batch
      // beyond its `maxStudents` even when payments land at the same time.
      const pending = await BatchEnrollment.find({ $or: filters })
        .select("_id batchId status paymentStatus accessExpiresAt billingPlan")
        .lean();

      for (const enrollment of pending) {
        // Skip already-active paid rows unless this is a monthly renewal (extend expiry).
        const alreadyActive =
          enrollment.status === "active" && enrollment.paymentStatus === "paid";
        if (alreadyActive && plan !== "monthly") continue;

        const batch = await Batch.findById(enrollment.batchId)
          .select("maxStudents")
          .lean();
        const maxStudents = Number(batch?.maxStudents) || 0;
        if (!alreadyActive && maxStudents > 0) {
          const activeCount = await BatchEnrollment.countDocuments({
            batchId: enrollment.batchId,
            _id: { $ne: enrollment._id },
            status: "active",
            paymentStatus: "paid",
          });
          if (activeCount >= maxStudents) {
            // Batch full — mark this enrollment paid but not active so an admin
            // can reconcile (e.g. refund or move to another section).
            await BatchEnrollment.updateOne(
              { _id: enrollment._id },
              { $set: { paymentStatus: "paid", status: "suspended", billingPlan: plan } },
            );
            continue;
          }
        }
        await BatchEnrollment.updateOne(
          { _id: enrollment._id },
          activationUpdate(plan, enrollment.accessExpiresAt as Date | undefined, "active"),
        );
      }
    }
    return "fulfilled";
  }

  await ensureCourseEnrollmentForPayment(payment);

  const enrollmentFilters: Record<string, unknown>[] = [];
  if (payment.enrollment) {
    enrollmentFilters.push({ _id: payment.enrollment });
  }
  if (payment.transactionId) {
    const studentFilter = payment.user ? { student: payment.user } : {};
    enrollmentFilters.push({ ...studentFilter, paymentId: payment.transactionId });
  }

  if (enrollmentFilters.length > 0) {
    const rows = await EnrollmentModel.find({
      $or: enrollmentFilters,
    })
      .select("_id status paymentStatus accessExpiresAt selectedBatchId student")
      .lean();
    for (const row of rows) {
      const alreadyPaid = row.paymentStatus === "paid";
      // Only extend already-paid enrollments on monthly renewals.
      if (alreadyPaid && plan !== "monthly") continue;
      const activation = activationUpdate(
        plan,
        row.accessExpiresAt as Date | undefined,
        "enrolled",
      );
      if (payment.transactionId) {
        activation.$set.paymentId = payment.transactionId;
      }
      if (typeof payment.amount === "number" && payment.amount > 0) {
        activation.$set.paymentAmount = payment.amount;
      }
      if (payment.batchId) {
        activation.$set.selectedBatchId = payment.batchId;
      }
      await EnrollmentModel.updateOne({ _id: row._id }, activation);
      await ensureLiveBatchPlacement(
        row._id,
        payment.course,
        payment.batchId,
        row.selectedBatchId ?? activation.$set.selectedBatchId,
      );
    }
  }

  if (enrollmentFilters.length > 0) {
    const matchedCount = await EnrollmentModel.countDocuments({
      $or: enrollmentFilters,
    });
    if (matchedCount === 0) {
      await ensureCourseEnrollmentForPayment(payment);
      const courseFilter: Record<string, unknown> = {
        student: payment.user,
        course: payment.course,
      };
      const rows = await EnrollmentModel.find(courseFilter)
        .select("_id status paymentStatus accessExpiresAt selectedBatchId student")
        .lean();
      for (const row of rows) {
        const activation = activationUpdate(
          plan,
          row.accessExpiresAt as Date | undefined,
          "enrolled",
        );
        if (payment.transactionId) {
          activation.$set.paymentId = payment.transactionId;
        }
        if (typeof payment.amount === "number" && payment.amount > 0) {
          activation.$set.paymentAmount = payment.amount;
        }
        if (payment.batchId) {
          activation.$set.selectedBatchId = payment.batchId;
        }
        await EnrollmentModel.updateOne({ _id: row._id }, activation);
        await ensureLiveBatchPlacement(
          row._id,
          payment.course,
          payment.batchId,
          row.selectedBatchId ?? activation.$set.selectedBatchId,
        );
      }
    }
  }

  return "fulfilled";
}
