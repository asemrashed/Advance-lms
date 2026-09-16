import { studentEnrolledBatchIds } from "@/app/api/_lib/batchAccess";
import { studentHasActivePaidCourseEnrollment } from "@/app/api/_lib/studentPrivateQbAccess";
import { isAdminAreaRole } from "@/lib/roles";
import type { AppRole } from "@/app/api/_lib/phase12";
import {
  DEFAULT_RESOURCE_ACCESS,
  TEST_YOURSELF_ENROLLED_LIMIT,
  TEST_YOURSELF_FREE_LIMIT,
  type ResourceCenterAccess,
} from "@/lib/resources/access";

export type { ResourceCenterAccess };

/**
 * Unified enrollment gate for Resource Center / Test Yourself.
 * Full access when the student has an active paid course enrollment
 * (or legacy batch enrollment that implies course access).
 */
export async function resolveResourceCenterAccess(
  userId?: string,
  role?: string,
): Promise<ResourceCenterAccess> {
  if (isAdminAreaRole(role) || role === "instructor") {
    return {
      fullAccess: true,
      batchEnrolled: true,
      courseEnrolled: true,
      freeLimit: TEST_YOURSELF_FREE_LIMIT,
      enrolledLimit: TEST_YOURSELF_ENROLLED_LIMIT,
    };
  }

  if (!userId) {
    return { ...DEFAULT_RESOURCE_ACCESS };
  }

  const [batchIds, courseEnrolled] = await Promise.all([
    studentEnrolledBatchIds(userId),
    studentHasActivePaidCourseEnrollment(userId),
  ]);
  const batchEnrolled = batchIds.length > 0;

  return {
    fullAccess: batchEnrolled || courseEnrolled,
    batchEnrolled,
    courseEnrolled,
    freeLimit: TEST_YOURSELF_FREE_LIMIT,
    enrolledLimit: TEST_YOURSELF_ENROLLED_LIMIT,
  };
}

export function summarizeResourceBrowseAccess<T extends { accessPolicy?: string; canDownload?: boolean }>(
  rows: T[],
) {
  const batchGated = rows.filter((r) => r.accessPolicy === "batch").length;
  const locked = rows.filter(
    (r) => r.accessPolicy === "batch" && r.canDownload === false,
  ).length;

  return {
    total: rows.length,
    batchGated,
    locked,
  };
}

/**
 * Public Resource Center (notes / worksheets): admin topical library only.
 * Instructor and course/lesson materials stay on the course, not this site.
 */
export function publicResourceCenterScopeFilter(): Record<string, unknown> {
  const missing = (field: string) => ({
    $or: [{ [field]: { $exists: false } }, { [field]: null }],
  });

  return {
    $and: [
      {
        $or: [{ accessPolicy: "public" }, { accessPolicy: { $exists: false } }],
      },
      missing("courseId"),
      missing("batchId"),
      missing("chapterId"),
      missing("lessonId"),
      {
        $or: [
          { scopeType: { $exists: false } },
          { scopeType: null },
          { scopeType: "subject" },
        ],
      },
    ],
  };
}

/** Admin resource pages: topical library only — hide instructor course materials. */
export function applyAdminResourceCenterListingScope(
  query: Record<string, unknown>,
  role: AppRole | undefined,
) {
  if (!isAdminAreaRole(role)) return;
  if (query.courseId) return;

  const scope = publicResourceCenterScopeFilter();
  const base = { ...query };
  for (const key of Object.keys(query)) {
    delete query[key];
  }
  query.$and = [base, scope];
}
