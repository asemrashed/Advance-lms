import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import { getDisplayName } from "@/lib/displayName";

export function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function requireInstructorJson() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      ),
    };
  }
  if (session.user.role !== "instructor") {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }
  return { userId: session.user.id };
}

export async function getInstructorCourseIds(
  userId: string,
): Promise<mongoose.Types.ObjectId[]> {
  const courses = await Course.find({
    $or: [{ instructor: userId }, { createdBy: userId }],
  })
    .select("_id")
    .lean();
  return courses.map((c) => c._id as mongoose.Types.ObjectId);
}

function courseIdFromLeanRef(courseField: unknown): string {
  if (
    courseField &&
    typeof courseField === "object" &&
    "_id" in (courseField as object)
  ) {
    return String((courseField as { _id: unknown })._id);
  }
  return String(courseField ?? "");
}

export function mapEnrollmentRow(row: Record<string, unknown>) {
  const coursePop = row.course as Record<string, unknown> | null;
  const studentPop = row.student as Record<string, unknown> | null;
  const selectedBatch = row.selectedBatchId as Record<string, unknown> | null;

  const courseLuInfo =
    coursePop && typeof coursePop === "object"
      ? {
          _id: String(coursePop._id ?? ""),
          title: coursePop.title as string | undefined,
          description: (coursePop.description ??
            coursePop.shortDescription) as string | undefined,
          thumbnailUrl: coursePop.thumbnailUrl as string | undefined,
          price: coursePop.price as number | undefined,
          category: coursePop.category as string | undefined,
          isPaid: Boolean(coursePop.isPaid),
        }
      : undefined;

  const studentInfo =
    studentPop && typeof studentPop === "object"
      ? {
          _id: String(studentPop._id ?? ""),
          name: getDisplayName(studentPop),
          email: studentPop.email ? String(studentPop.email) : "",
          avatar: studentPop.avatar ? String(studentPop.avatar) : undefined,
        }
      : undefined;

  return {
    _id: String(row._id),
    student: courseIdFromLeanRef(row.student),
    course: courseIdFromLeanRef(row.course),
    selectedBatchId: selectedBatch
      ? String(selectedBatch._id ?? "")
      : row.selectedBatchId
        ? String(row.selectedBatchId)
        : undefined,
    batchId: selectedBatch
      ? String(selectedBatch._id ?? "")
      : row.selectedBatchId
        ? String(row.selectedBatchId)
        : undefined,
    batchName: selectedBatch?.name ? String(selectedBatch.name) : undefined,
    enrolledAt: (row.enrolledAt as Date).toISOString(),
    status: row.status,
    progress: row.progress,
    lastAccessedAt: (row.lastAccessedAt as Date | undefined)?.toISOString(),
    completedAt: (row.completedAt as Date | undefined)?.toISOString(),
    droppedAt: (row.droppedAt as Date | undefined)?.toISOString(),
    suspendedAt: (row.suspendedAt as Date | undefined)?.toISOString(),
    paymentStatus: row.paymentStatus,
    paymentAmount: row.paymentAmount,
    paymentMethod: row.paymentMethod,
    paymentId: row.paymentId,
    billingPlan: row.billingPlan,
    accessBlocked: Boolean(row.accessBlocked),
    accessExpiresAt: (row.accessExpiresAt as Date | undefined)?.toISOString(),
    paymentDueAt: (row.paymentDueAt as Date | undefined)?.toISOString(),
    notes: row.notes,
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString(),
    courseLuInfo,
    studentInfo,
  };
}

export function buildEnrollmentStats(rows: Array<Record<string, unknown>>) {
  const total = rows.length;
  const statusCount = (status: string) =>
    rows.filter((r) => r.status === status).length;
  const paymentCount = (status: string) =>
    rows.filter((r) => r.paymentStatus === status).length;
  const totalRevenue = rows.reduce(
    (sum, r) =>
      sum + (r.paymentStatus === "paid" ? Number(r.paymentAmount || 0) : 0),
    0,
  );
  const averageProgress =
    total > 0
      ? rows.reduce((sum, r) => sum + Number(r.progress || 0), 0) / total
      : 0;
  const completed = statusCount("completed");
  const dropped = statusCount("dropped");

  return {
    total,
    active: statusCount("enrolled") + statusCount("in_progress"),
    completed,
    dropped,
    suspended: statusCount("suspended"),
    paid: paymentCount("paid"),
    pending: paymentCount("pending"),
    failed: paymentCount("failed"),
    totalRevenue,
    averageProgress,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    dropRate: total > 0 ? (dropped / total) * 100 : 0,
  };
}
