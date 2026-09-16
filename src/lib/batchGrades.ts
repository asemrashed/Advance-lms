export const BATCH_GRADES = ["PRE_O", "O", "A"] as const;

export type BatchGrade = (typeof BATCH_GRADES)[number];

const LEGACY_PRE_O_GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;

export function isBatchGrade(value: string): value is BatchGrade {
  return (BATCH_GRADES as readonly string[]).includes(value);
}

/** Map legacy Class 1–10 (and common aliases) onto the three current grades. */
export function normalizeBatchGrade(value: unknown, fallback: BatchGrade = "O"): BatchGrade {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (raw === "A" || raw === "A-LEVEL" || raw === "A LEVEL") return "A";
  if (raw === "O" || raw === "O-LEVEL" || raw === "O LEVEL") return "O";
  if (
    raw === "PRE_O" ||
    raw === "PRE-O" ||
    raw === "PREO" ||
    raw === "PRE-O LEVEL" ||
    raw === "PRE_O LEVEL" ||
    raw === "IDCSE" ||
    raw === "IGCSE" ||
    raw === "P"
  ) {
    return "PRE_O";
  }
  // Legacy Class 1–10 → IGCSE (stored as PRE_O)
  if (/^([1-9]|10)$/.test(raw)) return "PRE_O";
  return fallback;
}

/** Mongo-friendly grade match, including legacy Class 1–10 under IGCSE/PRE_O. */
export function buildGradeMatch(grade: string): string | { $in: string[] } {
  const normalized = normalizeBatchGrade(grade);
  if (normalized === "PRE_O") {
    return { $in: ["PRE_O", "IDCSE", "IGCSE", ...LEGACY_PRE_O_GRADES] };
  }
  return normalized;
}

/** Resolve a filter query param into a Mongo grade constraint (or null). */
export function resolveGradeQueryValue(
  grade: string | null | undefined,
): string | { $in: string[] } | null {
  if (!grade) return null;
  const raw = grade.trim().toUpperCase();
  if (!raw || raw === "ALL") return null;
  if (
    isBatchGrade(raw) ||
    raw === "PRE-O" ||
    raw === "IDCSE" ||
    raw === "IGCSE" ||
    /^([1-9]|10)$/.test(raw)
  ) {
    return buildGradeMatch(raw);
  }
  return raw;
}
