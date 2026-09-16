import { BATCH_GRADES } from "@/lib/batchGrades";

export function formatGradeLabel(grade?: string | null): string {
  if (!grade) return "";
  const g = grade.trim().toUpperCase();
  if (g === "PRE_O" || g === "PRE-O" || g === "IDCSE" || g === "IGCSE") return "IGCSE";
  if (g === "O") return "O Level";
  if (g === "A") return "A Level";
  // Legacy Class 1–10 display while any old rows remain
  if (/^([1-9]|10)$/.test(g)) return "IGCSE";
  return g;
}

/** Compact grade label for subject dropdowns, e.g. "O-Level", "A-Level". */
export function formatGradeBracketLabel(grade?: string | null): string {
  if (!grade) return "";
  const g = grade.trim().toUpperCase();
  if (g === "PRE_O" || g === "PRE-O" || g === "IDCSE" || g === "IGCSE") return "IGCSE";
  if (g === "O") return "O-Level";
  if (g === "A") return "A-Level";
  if (/^([1-9]|10)$/.test(g)) return "IGCSE";
  return g;
}

export type ResourceSubjectOptionFields = {
  name: string;
  code?: string | null;
  grade?: string | null;
};

/** e.g. "Additional Mathematics 0606" — class/grade is selected separately. */
export function formatResourceSubjectOptionLabel(
  subject: ResourceSubjectOptionFields,
): string {
  const name = subject.name.trim();
  const code = subject.code?.trim();
  return code ? `${name} ${code}` : name;
}

export type CourseLabelFields = {
  title?: string;
  subjectName?: string;
  grade?: string;
};

/** Disambiguate courses in dropdowns: Title · Subject · Grade */
export function formatCourseOptionLabel(course: CourseLabelFields): string {
  const parts = [
    course.title,
    course.subjectName,
    course.grade ? formatGradeLabel(course.grade) : undefined,
  ].filter(Boolean);
  return parts.join(" · ") || "Untitled course";
}

export const GRADE_FILTER_OPTIONS = BATCH_GRADES.map((g) => ({
  value: g,
  label: formatGradeLabel(g),
}));
