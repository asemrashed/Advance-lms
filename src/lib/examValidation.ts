/** Pure exam validation helpers (no DB imports). */

export function validateExamDateOrder(
  startDate?: Date | string | null,
  endDate?: Date | string | null,
): string | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "Invalid start or end date";
  if (end < start) return "End date must be after start date";
  return null;
}
