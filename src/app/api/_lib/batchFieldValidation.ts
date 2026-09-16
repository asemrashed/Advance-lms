/** Shared field parsing/validation for batch create and update APIs. */

/** Parses a date input; returns null when missing or unparseable. */
export function parseBatchDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Returns the value as a positive integer, or null when invalid. */
export function parseMaxStudents(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}

/** Returns the value as a finite nonnegative number, or null when invalid. */
export function parseFee(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}
