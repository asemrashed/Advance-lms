import mongoose from "mongoose";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import PastPaper from "@/models/PastPaper";
import { isObjectId, toObjectId, escapeRegex } from "@/app/api/_lib/phase12";
import type { AppRole } from "@/app/api/_lib/phase12";
import { resolveGradeQueryValue } from "@/lib/batchGrades";
import { isAdminAreaRole } from "@/lib/roles";

export type PastPaperFilterQuery = Record<string, unknown>;

export const ACTIVE_ENROLLMENT_STATUSES = [
  "enrolled",
  "in_progress",
  "completed",
] as const;

/** Papers visible to students (includes legacy docs without `isActive`). */
export const VISIBLE_PAST_PAPER_FILTER = { isActive: { $ne: false } };

function enrollmentCourseId(courseField: unknown): string {
  if (
    courseField &&
    typeof courseField === "object" &&
    "_id" in (courseField as object)
  ) {
    return String((courseField as { _id: unknown })._id);
  }
  return String(courseField ?? "");
}

function studentEnrollmentFilter(studentId: string) {
  if (!isObjectId(studentId)) {
    return { student: studentId };
  }
  const oid = toObjectId(studentId);
  return { student: { $in: [oid, studentId] } };
}

export type PastPaperFileType =
  | "question_paper"
  | "marks_pdf"
  | "work_solution";

const FILE_TYPE_TO_FIELD: Record<
  PastPaperFileType,
  "questionPaperUrl" | "marksPdfUrl" | "workSolutionUrl"
> = {
  question_paper: "questionPaperUrl",
  marks_pdf: "marksPdfUrl",
  work_solution: "workSolutionUrl",
};

export function resolveCourseId(body: Record<string, unknown>): string | null {
  const raw = body.courseId ?? body.course;
  if (typeof raw !== "string" || !raw.trim() || raw === "none") {
    return null;
  }
  return raw.trim();
}

export function instructorOwnsCourse(
  course: { instructor?: unknown; createdBy?: unknown },
  userId: string,
) {
  return (
    String(course.instructor || "") === userId ||
    String(course.createdBy || "") === userId
  );
}

export async function getStudentEnrolledCourseIds(
  studentId: string,
): Promise<string[]> {
  const rows = await Enrollment.find({
    ...studentEnrollmentFilter(studentId),
    status: { $nin: ["dropped", "suspended"] },
  })
    .select("course")
    .lean();

  const ids = rows
    .map((r) => enrollmentCourseId(r.course))
    .filter((id) => isObjectId(id));

  return [...new Set(ids)];
}

/** Courses an instructor may manage (assigned instructor or creator). */
export async function getInstructorCourseIds(
  userId: string,
): Promise<mongoose.Types.ObjectId[]> {
  if (!isObjectId(userId)) return [];

  const oid = toObjectId(userId);
  const courseIds = await Course.find({
    $or: [{ instructor: oid }, { createdBy: oid }],
  })
    .distinct("_id");

  return courseIds.map((id) => toObjectId(String(id)));
}

export async function applyPastPaperListScope(
  query: PastPaperFilterQuery,
  role: AppRole | undefined,
  userId: string | undefined,
): Promise<void> {
  if (!userId || !role) return;

  if (role === "student") {
    const courseIds = await getStudentEnrolledCourseIds(userId);
    if (courseIds.length === 0) {
      query.course = { $in: [] };
    } else {
      query.course = { $in: courseIds.map((id) => toObjectId(id)) };
    }
    query.isActive = { $ne: false };
    return;
  }

  if (role === "instructor") {
    const courseIds = await getInstructorCourseIds(userId);
    if (courseIds.length === 0) {
      query.course = { $in: [] };
    } else {
      query.course = { $in: courseIds };
    }
  }
}

export async function studentHasActiveEnrollment(
  studentId: string,
  courseId: string,
): Promise<boolean> {
  if (!isObjectId(courseId)) return false;

  const count = await Enrollment.countDocuments({
    ...studentEnrollmentFilter(studentId),
    course: toObjectId(courseId),
    status: { $nin: ["dropped", "suspended"] },
  });
  return count > 0;
}

export async function assertPastPaperCourseAccess(
  courseId: string,
  user: { id: string; role: AppRole },
) {
  if (!isObjectId(courseId)) {
    return { error: "Invalid course ID", status: 400 as const, course: null };
  }

  const course = await Course.findById(courseId)
    .select("_id instructor createdBy")
    .lean();

  if (!course) {
    return { error: "Course not found", status: 404 as const, course: null };
  }

  if (isAdminAreaRole(user.role)) {
    return { error: null, status: null, course };
  }

  if (user.role === "instructor" && instructorOwnsCourse(course, user.id)) {
    return { error: null, status: null, course };
  }

  return {
    error: "You do not have permission to manage past papers for this course",
    status: 403 as const,
    course: null,
  };
}

export async function assertPublicPastPaperFileAccess(
  paperId: string,
  fileType: PastPaperFileType,
) {
  if (!isObjectId(paperId)) {
    return { error: "Invalid past paper ID", status: 400 as const, url: null };
  }

  const paper = await PastPaper.findById(paperId)
    .select(
      "course isActive questionPaperUrl marksPdfUrl workSolutionUrl sessionName subject",
    )
    .lean();

  if (!paper) {
    return { error: "Past paper not found", status: 404 as const, url: null };
  }

  if (paper.isActive === false) {
    return {
      error: "This past paper is not available",
      status: 403 as const,
      url: null,
    };
  }

  const field = FILE_TYPE_TO_FIELD[fileType];
  const url = paper[field]?.trim();
  if (!url) {
    return { error: "File not available", status: 404 as const, url: null };
  }

  return { error: null, status: null, url };
}

/** @deprecated Use assertPublicPastPaperFileAccess — past papers are free for everyone. */
export async function assertStudentPastPaperDownload(
  paperId: string,
  _studentId: string,
  fileType: PastPaperFileType,
) {
  return assertPublicPastPaperFileAccess(paperId, fileType);
}

export function parsePastPaperYear(value: unknown): number | null {
  const year =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(year)) return null;
  if (year < 1900 || year > new Date().getFullYear() + 1) return null;
  return year;
}

export function trimOptionalUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parsePastPaperFileType(
  value: string | null,
): PastPaperFileType | null {
  if (
    value === "question_paper" ||
    value === "marks_pdf" ||
    value === "work_solution"
  ) {
    return value;
  }
  return null;
}

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "year",
  "sessionName",
  "subject",
  "examType",
]);

export function buildPastPaperFilterQuery(
  searchParams: URLSearchParams,
  options?: { includeYearRange?: boolean },
): PastPaperFilterQuery {
  const query: PastPaperFilterQuery = {};
  const search = searchParams.get("search");
  const sessionName = searchParams.get("sessionName");
  const year = searchParams.get("year");
  const subject = searchParams.get("subject");
  const examType = searchParams.get("examType");
  const grade = searchParams.get("grade");
  const paperType = searchParams.get("paperType");
  const isActive = searchParams.get("isActive");
  const courseId = searchParams.get("courseId");

  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { sessionName: { $regex: safe, $options: "i" } },
      { subject: { $regex: safe, $options: "i" } },
      { examType: { $regex: safe, $options: "i" } },
      { description: { $regex: safe, $options: "i" } },
      { tags: { $regex: safe, $options: "i" } },
    ];
  }

  if (sessionName) {
    query.sessionName = { $regex: escapeRegex(sessionName), $options: "i" };
  }

  if (subject) {
    query.subject = { $regex: escapeRegex(subject), $options: "i" };
  }

  if (grade && grade !== "all") {
    const gradeMatch = resolveGradeQueryValue(grade);
    if (gradeMatch) query.grade = gradeMatch;
  }

  if (examType) {
    query.examType = { $regex: escapeRegex(examType), $options: "i" };
  }

  if (year) {
    query.year = Number.parseInt(year, 10);
  } else if (options?.includeYearRange) {
    const yearFrom = searchParams.get("yearFrom");
    const yearTo = searchParams.get("yearTo");
    if (yearFrom || yearTo) {
      const yearFilter: Record<string, number> = {};
      if (yearFrom) yearFilter.$gte = Number.parseInt(yearFrom, 10);
      if (yearTo) yearFilter.$lte = Number.parseInt(yearTo, 10);
      query.year = yearFilter;
    }
  }

  if (paperType) {
    switch (paperType) {
      case "question_paper":
        query.questionPaperUrl = { $exists: true, $ne: "" };
        break;
      case "marks_pdf":
        query.marksPdfUrl = { $exists: true, $ne: "" };
        break;
      case "work_solution":
        query.workSolutionUrl = { $exists: true, $ne: "" };
        break;
    }
  }

  if (isActive != null) {
    query.isActive = isActive === "true";
  }

  if (courseId && isObjectId(courseId)) {
    query.course = toObjectId(courseId);
  }

  return query;
}

export function buildPastPaperSort(
  searchParams: URLSearchParams,
): Record<string, 1 | -1> {
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const field = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder === "asc" ? 1 : -1 };
}

const PUT_ALLOWED_FIELDS = [
  "sessionName",
  "year",
  "subject",
  "subjectId",
  "subjectCode",
  "grade",
  "examType",
  "questionPaperUrl",
  "marksPdfUrl",
  "workSolutionUrl",
  "description",
  "tags",
  "isActive",
] as const;

export function pickPastPaperUpdate(body: Record<string, unknown>) {
  const update: Record<string, unknown> = {};

  for (const key of PUT_ALLOWED_FIELDS) {
    if (!(key in body)) continue;
    const value = body[key];
    if (key === "year") {
      if (typeof value === "number") update.year = value;
      continue;
    }
    if (key === "isActive") {
      if (typeof value === "boolean") update.isActive = value;
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      update[key] =
        key === "questionPaperUrl" ||
        key === "marksPdfUrl" ||
        key === "workSolutionUrl" ||
        key === "description" ||
        key === "tags"
          ? trimmed || null
          : trimmed;
    }
  }

  return update;
}

export function hasAtLeastOnePaperUrl(paper: {
  questionPaperUrl?: string | null;
  marksPdfUrl?: string | null;
  workSolutionUrl?: string | null;
}) {
  return Boolean(
    paper.questionPaperUrl?.trim() ||
      paper.marksPdfUrl?.trim() ||
      paper.workSolutionUrl?.trim(),
  );
}
