import mongoose from "mongoose";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import QBAccessRequest from "@/models/QBAccessRequest";
import type { PaymentEntityType } from "@/models/Payment";
import type {
  PaymentAudience,
  PaymentFilters,
  PaymentItemInfo,
  PaymentRecord,
  PaymentStats,
} from "@/types/payment";
import { getDisplayName } from "@/lib/displayName";
import { entityTypeLabel } from "@/lib/invoice";

type PaymentQuery = Record<string, unknown>;

function asObjectId(value: string | undefined | null): mongoose.Types.ObjectId | null {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

export function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildPaymentStats(
  rows: Array<{ status?: string; amount?: number; gateway?: string }>,
): PaymentStats {
  const total = rows.length;
  const successfulRows = rows.filter((r) => r.status === "success");
  const successful = successfulRows.length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const totalRevenue = successfulRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const cashRows = successfulRows.filter((r) => r.gateway === "cash");
  const onlineRows = successfulRows.filter((r) => r.gateway !== "cash");
  const cashRevenue = cashRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const onlineRevenue = onlineRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  return {
    total,
    successful,
    pending,
    failed,
    totalRevenue,
    successRate,
    cashRevenue,
    onlineRevenue,
    cashCount: cashRows.length,
    onlineCount: onlineRows.length,
  };
}

/** Server-side stats for a payment query — no full-collection document load. */
export async function aggregatePaymentStats(
  query: PaymentQuery,
): Promise<PaymentStats> {
  const [row] = await Payment.aggregate<{
    total: number;
    successful: number;
    pending: number;
    failed: number;
    totalRevenue: number;
    cashRevenue: number;
    onlineRevenue: number;
    cashCount: number;
    onlineCount: number;
  }>([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        successful: {
          $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
        },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        totalRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$status", "success"] },
              { $ifNull: ["$amount", 0] },
              0,
            ],
          },
        },
        cashRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "success"] },
                  { $eq: ["$gateway", "cash"] },
                ],
              },
              { $ifNull: ["$amount", 0] },
              0,
            ],
          },
        },
        onlineRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "success"] },
                  { $ne: ["$gateway", "cash"] },
                ],
              },
              { $ifNull: ["$amount", 0] },
              0,
            ],
          },
        },
        cashCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "success"] },
                  { $eq: ["$gateway", "cash"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        onlineCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "success"] },
                  { $ne: ["$gateway", "cash"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  if (!row) {
    return {
      total: 0,
      successful: 0,
      pending: 0,
      failed: 0,
      totalRevenue: 0,
      successRate: 0,
      cashRevenue: 0,
      onlineRevenue: 0,
      cashCount: 0,
      onlineCount: 0,
    };
  }

  const total = Number(row.total) || 0;
  const successful = Number(row.successful) || 0;
  return {
    total,
    successful,
    pending: Number(row.pending) || 0,
    failed: Number(row.failed) || 0,
    totalRevenue: Number(row.totalRevenue) || 0,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    cashRevenue: Number(row.cashRevenue) || 0,
    onlineRevenue: Number(row.onlineRevenue) || 0,
    cashCount: Number(row.cashCount) || 0,
    onlineCount: Number(row.onlineCount) || 0,
  };
}

async function findUserIdsByNameSearch(
  search: string,
  role?: "student" | "instructor",
): Promise<mongoose.Types.ObjectId[]> {
  const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const userQuery: PaymentQuery = {
    $or: [
      { name: regex },
      { phone: regex },
      { email: regex },
    ],
  };
  if (role) userQuery.role = role;

  const users = await User.find(userQuery).select("_id").lean();
  return users.map((u) => u._id as mongoose.Types.ObjectId);
}

async function applyGradeFilter(
  query: PaymentQuery,
  grade: string,
): Promise<void> {
  const [courseDocs, batchDocs] = await Promise.all([
    Course.find({ grade }).select("_id").lean(),
    Batch.find({ grade }).select("_id").lean(),
  ]);
  const courseIds = courseDocs.map((c) => c._id);
  const batchIds = batchDocs.map((b) => b._id);
  const gradeOr = [
    ...(courseIds.length ? [{ course: { $in: courseIds } }] : []),
    ...(batchIds.length ? [{ batchId: { $in: batchIds } }] : []),
  ];
  if (gradeOr.length === 0) {
    query._id = { $in: [] };
    return;
  }
  if (!query.$and) query.$and = [];
  (query.$and as PaymentQuery[]).push({ $or: gradeOr });
}

async function applySubjectFilter(
  query: PaymentQuery,
  subject: string,
  audience: PaymentAudience,
): Promise<void> {
  const regex = new RegExp(
    subject.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );

  if (audience === "admin_instructors" || audience === "instructor_own") {
    const qbDocs = await QBAccessRequest.find({
      $or: [{ subjectName: regex }, { subjectCode: regex }],
    })
      .select("_id")
      .lean();
    const qbIds = qbDocs.map((q) => q._id);
    if (qbIds.length === 0) {
      query._id = { $in: [] };
      return;
    }
    query.qbAccessRequest = { $in: qbIds };
    return;
  }

  const [courseDocs, batchDocs] = await Promise.all([
    Course.find({
      $or: [{ subjectName: regex }, { category: regex }, { subjectCode: regex }],
    })
      .select("_id")
      .lean(),
    Batch.find({ subject: regex }).select("_id").lean(),
  ]);
  const courseIds = courseDocs.map((c) => c._id);
  const batchIds = batchDocs.map((b) => b._id);
  const subjectOr = [
    ...(courseIds.length ? [{ course: { $in: courseIds } }] : []),
    ...(batchIds.length ? [{ batchId: { $in: batchIds } }] : []),
  ];
  if (subjectOr.length === 0) {
    query._id = { $in: [] };
    return;
  }
  if (!query.$and) query.$and = [];
  (query.$and as PaymentQuery[]).push({ $or: subjectOr });
}

export type PaymentQueryScope = {
  audience: PaymentAudience;
  userId?: string;
  instructorCourseIds?: mongoose.Types.ObjectId[];
  instructorBatchIds?: mongoose.Types.ObjectId[];
};

export async function buildPaymentQuery(
  scope: PaymentQueryScope,
  filters: PaymentFilters,
): Promise<PaymentQuery> {
  const query: PaymentQuery = {};

  switch (scope.audience) {
    case "student":
    case "instructor_own":
      if (scope.userId) {
        // Aggregate $match does not cast strings → ObjectId (unlike find()).
        const userOid = asObjectId(scope.userId);
        query.user = userOid ?? scope.userId;
      }
      break;
    case "instructor_students":
      query.entityType = { $in: ["course", "batch"] };
      if (scope.instructorCourseIds?.length || scope.instructorBatchIds?.length) {
        const or: PaymentQuery[] = [];
        if (scope.instructorCourseIds?.length) {
          or.push({ course: { $in: scope.instructorCourseIds } });
        }
        if (scope.instructorBatchIds?.length) {
          or.push({ batchId: { $in: scope.instructorBatchIds } });
        }
        query.$or = or;
      } else {
        query._id = { $in: [] };
      }
      break;
    case "admin_students":
      query.entityType = { $in: ["course", "batch"] };
      break;
    case "admin_instructors":
      query.entityType = "qb_access";
      break;
    default:
      break;
  }

  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
  }

  if (filters.method === "online") {
    if (!query.$and) query.$and = [];
    (query.$and as PaymentQuery[]).push({
      $or: [
        { gateway: "sslcommerz" },
        { gateway: { $exists: false } },
        { gateway: null },
      ],
    });
  } else if (filters.method === "offline") {
    query.gateway = "cash";
  }

  if (filters.courseId) {
    query.course = asObjectId(filters.courseId) ?? filters.courseId;
  }

  if (filters.batchId) {
    query.batchId = asObjectId(filters.batchId) ?? filters.batchId;
  }

  if (filters.studentId) {
    query.user = asObjectId(filters.studentId) ?? filters.studentId;
  }

  if (filters.courseType) {
    const courseDocs = await Course.find({ courseType: filters.courseType })
      .select("_id")
      .lean();
    const courseIds = courseDocs.map((c) => c._id);
    const typeOr: PaymentQuery[] = [
      ...(courseIds.length ? [{ course: { $in: courseIds } }] : []),
    ];
    // Live batch payments are identified by entityType / batchId — do not load every Batch _id.
    if (filters.courseType === "live") {
      typeOr.push({ entityType: "batch" });
      typeOr.push({ batchId: { $exists: true, $ne: null } });
    }
    if (typeOr.length === 0) {
      query._id = { $in: [] };
    } else {
      if (!query.$and) query.$and = [];
      (query.$and as PaymentQuery[]).push({ $or: typeOr });
    }
  }

  if (filters.instructorId) {
    const [courseDocs, batchDocs] = await Promise.all([
      Course.find({
        $or: [
          { instructor: filters.instructorId },
          { createdBy: filters.instructorId },
        ],
      })
        .select("_id")
        .lean(),
      Batch.find({
        $or: [
          { instructorId: filters.instructorId },
          { instructorIds: filters.instructorId },
        ],
      })
        .select("_id")
        .lean(),
    ]);
    const courseIds = courseDocs.map((c) => c._id);
    const batchIds = batchDocs.map((b) => b._id);
    const instrOr = [
      ...(courseIds.length ? [{ course: { $in: courseIds } }] : []),
      ...(batchIds.length ? [{ batchId: { $in: batchIds } }] : []),
    ];
    if (instrOr.length === 0) {
      query._id = { $in: [] };
    } else {
      if (!query.$and) query.$and = [];
      (query.$and as PaymentQuery[]).push({ $or: instrOr });
    }
  }

  if (filters.year) {
    const y = Number.parseInt(filters.year, 10);
    if (Number.isFinite(y) && y > 2000) {
      query.createdAt = {
        $gte: new Date(`${y}-01-01T00:00:00.000Z`),
        $lt: new Date(`${y + 1}-01-01T00:00:00.000Z`),
      };
    }
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (scope.audience === "student" || scope.audience === "instructor_own") {
      query.transactionId = new RegExp(term, "i");
    } else {
      const role =
        scope.audience === "admin_instructors"
          ? "instructor"
          : "student";
      const userIds = await findUserIdsByNameSearch(filters.search, role);
      if (userIds.length === 0) {
        query._id = { $in: [] };
      } else {
        query.user = { $in: userIds };
      }
    }
  }

  if (filters.grade?.trim()) {
    await applyGradeFilter(query, filters.grade.trim());
  }

  if (filters.subject?.trim()) {
    await applySubjectFilter(query, filters.subject, scope.audience);
  }

  return query;
}

type LeanPayment = {
  _id: unknown;
  user: unknown;
  entityType: string;
  course?: unknown;
  batchId?: unknown;
  qbAccessRequest?: unknown;
  amount: number;
  originalAmount?: number;
  discountApplied?: boolean;
  transactionId: string;
  gateway?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function payerFromPopulated(userField: unknown) {
  if (!userField || typeof userField !== "object") return undefined;
  const u = userField as Record<string, unknown>;
  return {
    _id: String(u._id ?? ""),
    name: getDisplayName(u),
    email: u.email ? String(u.email) : undefined,
    phone: u.phone ? String(u.phone) : undefined,
    role: u.role ? String(u.role) : undefined,
  };
}

function itemFromPayment(
  row: LeanPayment,
  coursePop?: Record<string, unknown> | null,
  batchPop?: Record<string, unknown> | null,
  qbPop?: Record<string, unknown> | null,
): PaymentItemInfo {
  const entityType = row.entityType as PaymentEntityType;

  if (entityType === "qb_access" && qbPop) {
    const subject = qbPop.subjectName ? String(qbPop.subjectName) : undefined;
    const grade = qbPop.grade ? String(qbPop.grade) : undefined;
    const title = subject
      ? `Platform Question Bank — ${subject}${grade ? ` (${grade})` : ""}`
      : "Platform Question Bank Access";
    return {
      title,
      type: entityType,
      typeLabel: entityTypeLabel(entityType),
      grade,
      subject,
    };
  }

  if (entityType === "batch" && batchPop) {
    return {
      title: String(batchPop.name || batchPop.subject || "Batch enrollment"),
      type: entityType,
      typeLabel: entityTypeLabel(entityType),
      batchId: String(batchPop._id ?? row.batchId ?? ""),
      batchName: String(batchPop.name || ""),
      grade: batchPop.grade ? String(batchPop.grade) : undefined,
      subject: batchPop.subject ? String(batchPop.subject) : undefined,
    };
  }

  if (coursePop) {
    const courseType: PaymentEntityType = entityType === "batch" ? "batch" : "course";
    return {
      title: String(coursePop.title || "Course enrollment"),
      type: courseType,
      typeLabel: entityTypeLabel(courseType),
      courseId: String(coursePop._id ?? row.course ?? ""),
      batchId: batchPop?._id ? String(batchPop._id) : row.batchId ? String(row.batchId) : undefined,
      batchName: batchPop?.name ? String(batchPop.name) : undefined,
      grade: coursePop.grade ? String(coursePop.grade) : undefined,
      subject: coursePop.subjectName
        ? String(coursePop.subjectName)
        : coursePop.category
          ? String(coursePop.category)
          : undefined,
    };
  }

  return {
    title: entityTypeLabel(entityType),
    type: entityType,
    typeLabel: entityTypeLabel(entityType),
  };
}

export function mapPaymentRow(
  row: LeanPayment,
  related?: {
    user?: unknown;
    course?: unknown;
    batch?: unknown;
    qbAccessRequest?: unknown;
  },
): PaymentRecord {
  const coursePop =
    related?.course && typeof related.course === "object"
      ? (related.course as Record<string, unknown>)
      : null;
  const batchPop =
    related?.batch && typeof related.batch === "object"
      ? (related.batch as Record<string, unknown>)
      : null;
  const qbPop =
    related?.qbAccessRequest && typeof related.qbAccessRequest === "object"
      ? (related.qbAccessRequest as Record<string, unknown>)
      : null;

  return {
    _id: String(row._id),
    transactionId: row.transactionId,
    amount: Number(row.amount) || 0,
    originalAmount:
      row.originalAmount != null ? Number(row.originalAmount) : undefined,
    discountApplied: Boolean(row.discountApplied),
    status: row.status as PaymentRecord["status"],
    gateway: row.gateway === "cash" ? "cash" : "sslcommerz",
    methodLabel: row.gateway === "cash" ? "Offline" : "Online",
    entityType: row.entityType as PaymentRecord["entityType"],
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    payer: payerFromPopulated(related?.user ?? row.user),
    item: itemFromPayment(row, coursePop, batchPop, qbPop),
    canDownloadInvoice: row.status === "success",
  };
}

export async function listPayments(
  scope: PaymentQueryScope,
  filters: PaymentFilters,
) {
  const page = filters.page > 0 ? filters.page : 1;
  const limit = filters.limit > 0 ? Math.min(filters.limit, 100) : 10;
  const skip = (page - 1) * limit;

  const query = await buildPaymentQuery(scope, filters);

  const [total, rows, stats] = await Promise.all([
    Payment.countDocuments(query),
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "user", select: "name email phone role" })
      .populate({ path: "course", select: "title grade subjectName category" })
      .populate({ path: "batchId", select: "name subject grade" })
      .populate({
        path: "qbAccessRequest",
        select: "subjectName subjectCode grade",
      })
      .lean(),
    aggregatePaymentStats(query),
  ]);

  const payments = (rows as LeanPayment[]).map((row) =>
    mapPaymentRow(row, {
      user: row.user,
      course: row.course,
      batch: row.batchId,
      qbAccessRequest: row.qbAccessRequest,
    }),
  );

  const pages = Math.ceil(total / limit) || 0;

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
    stats,
  };
}

export async function getInstructorScopeIds(instructorId: string) {
  const courses = await Course.find({
    $or: [{ instructor: instructorId }, { createdBy: instructorId }],
  })
    .select("_id")
    .lean();

  const courseIds = courses.map((c) => c._id as mongoose.Types.ObjectId);

  // Instructor ownership can be expressed either directly on Batch documents
  // (instructorId/instructorIds) or indirectly via the parent course.
  const [batchesDirect, batchesFromCourses] = await Promise.all([
    Batch.find({
      $or: [{ instructorId }, { instructorIds: instructorId }],
    })
      .select("_id")
      .lean(),
    Batch.find({
      courseId: { $in: courseIds },
    })
      .select("_id")
      .lean(),
  ]);

  const batchIds = Array.from(
    new Set([
      ...batchesDirect.map((b) => String(b._id)),
      ...batchesFromCourses.map((b) => String(b._id)),
    ]),
  ).map((id) => new mongoose.Types.ObjectId(id));

  return { courseIds, batchIds };
}
