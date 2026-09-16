import ResourceWorksheet, {
  type ResourceWorksheetAccessPolicy,
} from "@/models/ResourceWorksheet";
import { isObjectId, toObjectId, type AppRole } from "@/app/api/_lib/phase12";
import {
  mapScopeFromRow,
  pickScopeUpdate,
  resolveParsedScope,
  resolveResourceCourseId,
  resolveScopeLabels,
  studentCanAccessCourseScopedResource,
} from "@/app/api/_lib/resourceScope";
import {
  applyAdminResourceCenterListingScope,
  publicResourceCenterScopeFilter,
} from "@/app/api/_lib/resourceAccess";
import { normalizeBatchGrade } from "@/lib/batchGrades";
import { isAdminAreaRole } from "@/lib/roles";

export const VISIBLE_RESOURCE_WORKSHEET_FILTER = { isActive: { $ne: false } };

export function canonicalWorksheetGrade(
  value: unknown,
): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return normalizeBatchGrade(value);
}

/**
 * Public Resource Center worksheets only (admin topical library).
 * Course/instructor sheets are not listed here.
 */
export async function buildResourceWorksheetBrowseFilter(_params?: {
  userId?: string;
  role?: string;
}): Promise<Record<string, unknown>> {
  return {
    ...VISIBLE_RESOURCE_WORKSHEET_FILTER,
    ...publicResourceCenterScopeFilter(),
  };
}

export function trimOptionalUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseAccessPolicy(
  value: unknown,
): ResourceWorksheetAccessPolicy | null {
  if (value === "public" || value === "batch") return value;
  return null;
}

export type ResourceWorksheetFileType = "worksheet" | "marks_pdf";

export function parseResourceWorksheetFileType(
  value: unknown,
): ResourceWorksheetFileType {
  if (value === "marks_pdf" || value === "ms") return "marks_pdf";
  return "worksheet";
}

export function mapResourceWorksheet(
  row: Record<string, unknown>,
  options?: { includePdf?: boolean; canDownload?: boolean },
) {
  const includePdf = options?.includePdf ?? true;
  const base = {
    _id: String(row._id),
    title: String(row.title ?? ""),
    subject: String(row.subject ?? ""),
    subjectId: row.subjectId ? String(row.subjectId) : undefined,
    subjectCode: row.subjectCode ? String(row.subjectCode) : undefined,
    topic: String(row.topic ?? ""),
    grade: row.grade ? String(row.grade) : undefined,
    ...mapScopeFromRow(row),
    description: row.description ? String(row.description) : undefined,
    sourceType: row.sourceType === "course_qb" ? "course_qb" : "upload",
    hasWorksheetPdf: Boolean(
      typeof row.pdfUrl === "string" && row.pdfUrl.trim(),
    ),
    hasMarksPdf: Boolean(
      typeof row.marksPdfUrl === "string" && row.marksPdfUrl.trim(),
    ),
    questionIds: Array.isArray(row.questionIds)
      ? (row.questionIds as unknown[]).map((id) => String(id))
      : undefined,
    isActive: row.isActive !== false,
    accessPolicy: (
      row.accessPolicy === "batch" &&
      (row.courseId || row.batchId) &&
      row.scopeType !== "subject"
        ? "batch"
        : "public"
    ) as ResourceWorksheetAccessPolicy,
    canDownload: options?.canDownload,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (!includePdf) return base;

  return {
    ...base,
    pdfUrl: row.pdfUrl ? String(row.pdfUrl) : undefined,
    pdfPublicId: row.pdfPublicId ? String(row.pdfPublicId) : undefined,
    marksPdfUrl: row.marksPdfUrl ? String(row.marksPdfUrl) : undefined,
    marksPdfPublicId: row.marksPdfPublicId
      ? String(row.marksPdfPublicId)
      : undefined,
  };
}

export async function applyResourceWorksheetStaffScope(
  query: Record<string, unknown>,
  role: AppRole | undefined,
  userId: string | undefined,
) {
  if (role === "instructor" && userId && isObjectId(userId)) {
    query.uploadedBy = toObjectId(userId);
    query.accessPolicy = "batch";
    return;
  }
  applyAdminResourceCenterListingScope(query, role);
}

/** Gated worksheets: buyers of the linked course. */
export async function studentCanDownloadWorksheet(
  studentId: string | undefined,
  row: { accessPolicy?: string; courseId?: unknown; batchId?: unknown },
): Promise<boolean> {
  if (row.accessPolicy !== "batch") return true;

  const courseId = await resolveResourceCourseId(row);
  // Subject-scoped / ungated sheets cannot require enrollment.
  if (!courseId) return true;
  if (!studentId) return false;
  return studentCanAccessCourseScopedResource(studentId, courseId);
}

export async function resolveWorksheetBrowseCanDownload(
  userId: string | undefined,
  role: string | undefined,
  row: { accessPolicy?: string; courseId?: unknown; batchId?: unknown },
) {
  if (row.accessPolicy !== "batch") return true;
  if (isAdminAreaRole(role) || role === "instructor") return true;
  return studentCanDownloadWorksheet(userId, row);
}

export async function pickResourceWorksheetUpdate(body: Record<string, unknown>) {
  const update: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) {
    update.title = body.title.trim();
  }
  if (typeof body.pdfUrl === "string" && body.pdfUrl.trim()) {
    update.pdfUrl = body.pdfUrl.trim();
  }
  if (typeof body.pdfPublicId === "string") {
    update.pdfPublicId = body.pdfPublicId.trim() || undefined;
  }
  if (typeof body.marksPdfUrl === "string") {
    update.marksPdfUrl = body.marksPdfUrl.trim() || undefined;
  }
  if (typeof body.marksPdfPublicId === "string") {
    update.marksPdfPublicId = body.marksPdfPublicId.trim() || undefined;
  }
  if (typeof body.description === "string") {
    update.description = body.description.trim() || undefined;
  }
  if (typeof body.isActive === "boolean") {
    update.isActive = body.isActive;
  }
  const policy = parseAccessPolicy(body.accessPolicy);
  if (policy) update.accessPolicy = policy;

  Object.assign(update, await pickScopeUpdate(body));

  return update;
}

/** One ResourceWorksheet per lesson (course materials). */
export async function findWorksheetConflictForLesson(
  lessonId: string | undefined | null,
  excludeWorksheetId?: string,
) {
  const id = lessonId != null ? String(lessonId).trim() : "";
  if (!id || !isObjectId(id)) return null;
  const query: Record<string, unknown> = { lessonId: toObjectId(id) };
  if (excludeWorksheetId && isObjectId(excludeWorksheetId)) {
    query._id = { $ne: toObjectId(excludeWorksheetId) };
  }
  return ResourceWorksheet.findOne(query).select("_id title").lean();
}

export async function applyScopeLabelsToUpdate(
  body: Record<string, unknown>,
  update: Record<string, unknown>,
) {
  const scope = await resolveParsedScope(body);
  if (scope) {
    const labels = await resolveScopeLabels(scope);
    update.subject = labels.subject;
    update.topic = labels.topic;
    update.grade = labels.grade;
  }
}

export async function assertResourceWorksheetStaffAccess(
  id: string,
  user: { id: string; role: AppRole },
) {
  if (!isObjectId(id)) {
    return { error: "Invalid worksheet ID", status: 400 as const, row: null };
  }

  const row = await ResourceWorksheet.findById(id).lean();
  if (!row) {
    return { error: "Worksheet not found", status: 404 as const, row: null };
  }

  if (isAdminAreaRole(user.role)) {
    return { error: null, status: null, row };
  }

  if (
    user.role === "instructor" &&
    String(row.uploadedBy ?? "") === user.id &&
    row.accessPolicy === "batch"
  ) {
    return { error: null, status: null, row };
  }

  return {
    error: "You do not have permission to manage this worksheet",
    status: 403 as const,
    row: null,
  };
}

export async function assertResourceWorksheetDownload(
  id: string,
  userId: string | undefined,
  role: string | undefined,
  fileType: ResourceWorksheetFileType = "worksheet",
) {
  if (!isObjectId(id)) {
    return { error: "Invalid worksheet ID", status: 400 as const, url: null, pdfPublicId: null };
  }

  const row = await ResourceWorksheet.findById(id)
    .select(
      "pdfUrl pdfPublicId marksPdfUrl marksPdfPublicId isActive accessPolicy courseId batchId",
    )
    .lean();

  if (!row) {
    return { error: "Worksheet not found", status: 404 as const, url: null, pdfPublicId: null };
  }

  if (row.isActive === false) {
    return {
      error: "This worksheet is not available",
      status: 403 as const,
      url: null,
      pdfPublicId: null,
    };
  }

  let url: string | null = null;
  let pdfPublicId: string | null = null;

  if (fileType === "marks_pdf") {
    if (!row.marksPdfUrl?.trim()) {
      return {
        error: "Marks schema not available",
        status: 404 as const,
        url: null,
        pdfPublicId: null,
      };
    }
    url = row.marksPdfUrl.trim();
    pdfPublicId = row.marksPdfPublicId ? String(row.marksPdfPublicId) : null;
  } else {
    if (!row.pdfUrl?.trim()) {
      return { error: "PDF not available", status: 404 as const, url: null, pdfPublicId: null };
    }
    url = row.pdfUrl.trim();
    pdfPublicId = row.pdfPublicId ? String(row.pdfPublicId) : null;
  }

  if (isAdminAreaRole(role) || role === "instructor") {
    return { error: null, status: null, url, pdfPublicId };
  }

  const allowed = await studentCanDownloadWorksheet(userId, row);
  if (!allowed) {
    return {
      error: "Enroll in this course to download this worksheet",
      status: 403 as const,
      url: null,
      pdfPublicId: null,
    };
  }

  return { error: null, status: null, url, pdfPublicId };
}
