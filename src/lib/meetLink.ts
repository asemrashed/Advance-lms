export function normalizeMeetLink(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Prefer the lesson/session link, then the permanent batch/course link. */
export function resolveMeetLink(
  liveMeetLink?: string | null,
  batchMeetLink?: string | null,
): string | undefined {
  return (
    normalizeMeetLink(liveMeetLink) ||
    normalizeMeetLink(batchMeetLink) ||
    undefined
  );
}
