import mongoose from "mongoose";
import { resolveSubjectById } from "@/app/api/_lib/subjects";
import { resolveGradeQueryValue } from "@/lib/batchGrades";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match clauses for linking a course document to a catalog subject. */
export function buildSubjectMatchClauses(subject: {
  _id?: unknown;
  code?: string;
  name?: string;
  slug?: string;
}): Record<string, unknown>[] {
  const id = subject._id != null ? String(subject._id) : "";
  const code = String(subject.code || "").trim();
  const name = String(subject.name || "").trim();
  const slug = String(subject.slug || "").trim();
  const namePattern = name ? new RegExp(`^${escapeRegex(name)}$`, "i") : null;

  return [
    ...(id ? [{ subjectId: id }] : []),
    ...(code ? [{ subjectCode: code }] : []),
    ...(name
      ? [
          { subjectName: name },
          { category: name },
          ...(namePattern
            ? [
                { subjectName: { $regex: namePattern } },
                { category: { $regex: namePattern } },
              ]
            : []),
        ]
      : []),
    ...(slug ? [{ category: slug }] : []),
  ];
}

export async function buildSubjectFilter(
  subjectId: string,
): Promise<Record<string, unknown> | null> {
  const trimmed = (subjectId || "").trim();
  if (!trimmed || trimmed === "all") return null;

  const subject = await resolveSubjectById(trimmed);
  if (!subject) return null;

  const clauses = buildSubjectMatchClauses(subject as Record<string, unknown>);
  if (!clauses.length) return null;

  return { $or: clauses };
}

export function buildInstructorFilter(
  instructorId: string,
): Record<string, unknown> | null {
  const trimmed = (instructorId || "").trim();
  if (!trimmed || trimmed === "all") return null;
  if (!mongoose.Types.ObjectId.isValid(trimmed)) return null;
  return { instructor: new mongoose.Types.ObjectId(trimmed) };
}

export function buildGradeFilter(grade: string): Record<string, unknown> | null {
  const match = resolveGradeQueryValue(grade);
  if (!match) return null;
  return { grade: match };
}

export async function applyCourseCatalogFilters(
  baseFilter: Record<string, unknown>,
  options: {
    subjectId?: string | null;
    instructorId?: string | null;
    grade?: string | null;
  },
): Promise<Record<string, unknown>> {
  const andClauses: Record<string, unknown>[] = [baseFilter];

  const subjectFilter = options.subjectId
    ? await buildSubjectFilter(options.subjectId)
    : null;
  if (subjectFilter) andClauses.push(subjectFilter);

  const instructorFilter = options.instructorId
    ? buildInstructorFilter(options.instructorId)
    : null;
  if (instructorFilter) andClauses.push(instructorFilter);

  const gradeFilter = options.grade ? buildGradeFilter(options.grade) : null;
  if (gradeFilter) andClauses.push(gradeFilter);

  if (andClauses.length === 1) return baseFilter;
  return { $and: andClauses };
}

export function buildPublicCatalogBaseFilter(
  courseType?: string | null,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    status: "published",
    isHidden: { $ne: true },
  };
  const normalized = String(courseType || "").trim().toLowerCase();
  if (normalized === "live" || normalized === "recorded") {
    filter.courseType = normalized;
  }
  return filter;
}

export type PublicCatalogFilterQuery = {
  courseType?: string | null;
  grade?: string | null;
  subjectId?: string | null;
  instructorId?: string | null;
};

export function normalizeCatalogFilterParam(value?: string | null): string | null {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "all") return null;
  return trimmed;
}
