import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import {
  isAdminAreaRole,
  isSuperAdmin,
  type AppRole,
} from "@/lib/roles";

export type { AppRole } from "@/lib/roles";

export type SessionUser = {
  id: string;
  role: AppRole;
};

/**
 * When callers list `"admin"`, also accept `"super_admin"` (shared admin area).
 * Pass `["super_admin"]` alone for privileged-only endpoints.
 */
function expandAllowedRoles(roles?: AppRole[]): AppRole[] | undefined {
  if (!roles) return undefined;
  if (roles.includes("admin") && !roles.includes("super_admin")) {
    return [...roles, "super_admin"];
  }
  return roles;
}

export async function requireSessionUser(roles?: AppRole[]) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role as AppRole | undefined;

  if (!userId || !role) {
    return {
      error: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      ),
      user: null,
    };
  }

  const allowed = expandAllowedRoles(roles);
  if (allowed && !allowed.includes(role)) {
    return {
      error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }

  await connectDB();
  return { error: null, user: { id: userId, role } satisfies SessionUser };
}

/** Privileged platform mutations (invite admins, CMS, settings, finance, etc.). */
export async function requireSuperAdmin() {
  return requireSessionUser(["super_admin"]);
}

export function assertAdminAreaRole(role: string | null | undefined) {
  return isAdminAreaRole(role);
}

export function assertSuperAdmin(role: string | null | undefined) {
  return isSuperAdmin(role);
}

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

/** Escape user input before interpolating into Mongo `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
}

export function parsePage(searchParams: URLSearchParams, fallback = 1) {
  const page = Number.parseInt(searchParams.get("page") || "", 10);
  return Number.isFinite(page) && page > 0 ? page : fallback;
}

export function parseLimit(searchParams: URLSearchParams, fallback = 10, max = 200) {
  const limit = Number.parseInt(searchParams.get("limit") || "", 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(limit, max);
}

export function pagination(page: number, limit: number, total: number) {
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1 && pages > 0,
  };
}

import { getDisplayName } from "@/lib/displayName";

export function normalizeStudentName(student: {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}) {
  return getDisplayName(student, "");
}

/** Exams the instructor may manage: created by them or attached to a course they teach. */
export async function instructorExamAccessMatch(userId: string): Promise<Record<string, unknown>> {
  const oid = toObjectId(userId);
  const teachingCourseIds = await Course.find({ instructor: oid }).distinct("_id");
  return {
    $or: [
      { createdBy: oid },
      ...(teachingCourseIds.length ? [{ course: { $in: teachingCourseIds } }] : []),
    ],
  };
}
