/** Granular work limits super admins assign to regular admins. */

export const ADMIN_PERMISSIONS = [
  {
    key: "enroll_students",
    label: "Enroll students",
    description: "Manually enroll students in courses, including unregistered students",
    group: "People",
  },
  {
    key: "manage_enrollments",
    label: "Manage enrollments",
    description: "Edit enrollments, extend dues, and change payment details",
    group: "People",
  },
  {
    key: "review_enrollment_requests",
    label: "Review cash enrollment requests",
    description: "Approve or reject student cash / offline enrollment requests",
    group: "People",
  },
  {
    key: "manage_students",
    label: "Manage students",
    description: "Create and update student accounts",
    group: "People",
  },
  {
    key: "manage_teachers",
    label: "Manage instructors",
    description: "Create, update, and approve instructor accounts",
    group: "People",
  },
  {
    key: "accept_course_requests",
    label: "Accept instructor course requests",
    description: "Approve or reject courses submitted by instructors",
    group: "Learning",
  },
  {
    key: "create_subjects",
    label: "Create & edit subjects",
    description: "Add, update, and delete subjects",
    group: "Learning",
  },
  {
    key: "view_payments",
    label: "View payment history",
    description: "Open payment history and browse transactions",
    group: "Finance",
  },
  {
    key: "view_platform_income",
    label: "View platform income",
    description: "See student payments and platform revenue totals",
    group: "Finance",
  },
  {
    key: "view_instructor_income",
    label: "View instructor income",
    description: "See instructor cash, online, and overview payment totals",
    group: "Finance",
  },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]["key"];

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSIONS.map(
  (item) => item.key,
);

/** Legacy admins keep subject create + cash request review (previous default). */
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermission[] = [
  "create_subjects",
  "review_enrollment_requests",
];

const PERMISSION_SET = new Set<string>(ALL_ADMIN_PERMISSIONS);

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

export function sanitizeAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<AdminPermission>();
  for (const item of value) {
    if (isAdminPermission(item)) unique.add(item);
  }
  return ALL_ADMIN_PERMISSIONS.filter((key) => unique.has(key));
}

/**
 * `undefined` / missing = legacy defaults.
 * An explicit array (including empty) is stored as-is.
 */
export function resolveAdminPermissions(
  stored: unknown,
  options?: { role?: string | null },
): AdminPermission[] {
  if (options?.role === "super_admin") return [...ALL_ADMIN_PERMISSIONS];
  if (stored == null) return [...DEFAULT_ADMIN_PERMISSIONS];
  return sanitizeAdminPermissions(stored);
}

export function hasAdminPermission(
  permissions: readonly string[] | null | undefined,
  permission: AdminPermission,
  role?: string | null,
): boolean {
  if (role === "super_admin") return true;
  return Boolean(permissions?.includes(permission));
}

export function canAccessAdminPayments(
  permissions: readonly string[] | null | undefined,
  role?: string | null,
): boolean {
  return (
    hasAdminPermission(permissions, "view_payments", role) ||
    hasAdminPermission(permissions, "view_platform_income", role) ||
    hasAdminPermission(permissions, "view_instructor_income", role)
  );
}

export const ADMIN_PERMISSION_GROUPS = Array.from(
  new Set(ADMIN_PERMISSIONS.map((item) => item.group)),
);

/** Shared one-time password for students created during manual enrollment. */
export const MANUAL_ENROLL_STUDENT_PASSWORD = "Student123";
