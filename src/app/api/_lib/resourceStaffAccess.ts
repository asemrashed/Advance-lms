/**
 * Phase 3 resource access:
 * - Platform / public Resource Center CRUD → admin only
 * - Instructors may manage notes/worksheets only as course-scoped (accessPolicy: batch)
 */
import { NextResponse } from "next/server";
import Course from "@/models/Course";
import { canManageCourse } from "@/app/api/_lib/courseAccess";
import { isObjectId } from "@/app/api/_lib/phase12";
import type { SessionUser } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";

export function platformResourcesAdminOnlyError() {
  return NextResponse.json(
    {
      success: false,
      error:
        "The public Resource Center is managed by admin only. Instructors share materials on their courses instead.",
      code: "PLATFORM_RESOURCES_ADMIN_ONLY",
    },
    { status: 403 },
  );
}

/** Past papers + Test Yourself: admin-only mutations. */
export function requireAdminPlatformResources(user: SessionUser) {
  if (!isAdminAreaRole(user.role)) {
    return { error: platformResourcesAdminOnlyError() };
  }
  return { error: null };
}

/**
 * Notes / worksheets create-update:
 * - Admin subject-scoped (no course): always public Resource Center
 * - Admin course-scoped: requested accessPolicy (default public)
 * - Instructor: must own course; accessPolicy forced to batch (never public)
 */
export async function resolveNoteWorksheetAccessPolicy(params: {
  user: SessionUser;
  accessPolicyRaw: unknown;
  courseId?: string | null;
}): Promise<
  | { error: NextResponse; accessPolicy?: undefined }
  | { error: null; accessPolicy: "public" | "batch" }
> {
  const { user, accessPolicyRaw, courseId } = params;
  const requested =
    accessPolicyRaw === "batch" || accessPolicyRaw === "public"
      ? accessPolicyRaw
      : null;

  if (isAdminAreaRole(user.role)) {
    const cid = String(courseId || "").trim();
    // Subject-scoped Resource Center items have nothing to enroll in.
    if (!cid || !isObjectId(cid)) {
      return { error: null, accessPolicy: "public" };
    }
    return { error: null, accessPolicy: requested ?? "public" };
  }

  if (user.role !== "instructor") {
    return { error: platformResourcesAdminOnlyError() };
  }

  const cid = String(courseId || "").trim();
  if (!cid || !isObjectId(cid)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error:
            "Course is required. Instructors can only share materials on their own courses.",
          code: "COURSE_SCOPE_REQUIRED",
        },
        { status: 400 },
      ),
    };
  }

  const course = await Course.findById(cid).select("instructor createdBy").lean();
  if (!course || !canManageCourse(course, user.id, user.role)) {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden", code: "COURSE_FORBIDDEN" },
        { status: 403 },
      ),
    };
  }

  if (requested === "public") {
    return {
      error: NextResponse.json(
        {
          success: false,
          error:
            "Instructors cannot publish to the public Resource Center. Materials stay course-scoped for enrolled students.",
          code: "PUBLIC_RESOURCES_ADMIN_ONLY",
        },
        { status: 403 },
      ),
    };
  }

  return { error: null, accessPolicy: "batch" };
}
