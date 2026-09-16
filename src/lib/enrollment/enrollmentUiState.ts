export type EnrollmentUiState = "none" | "enrolled" | "pending";

export function isCourseFree(isPaid?: boolean, finalPrice?: number): boolean {
  return !isPaid || (finalPrice ?? 0) <= 0;
}

export function resolveRecordedEnrollmentState(
  enrollments: { course: string; status: string; paymentStatus: string }[],
  courseId: string,
): EnrollmentUiState {
  const row = enrollments.find((e) => String(e.course) === String(courseId));
  if (!row) return "none";

  const status = String(row.status || "").toLowerCase();
  if (
    row.paymentStatus === "paid" &&
    ["enrolled", "in_progress", "completed"].includes(status)
  ) {
    return "enrolled";
  }
  if (row.paymentStatus === "pending") return "pending";
  return "none";
}

export function resolveBatchEnrollmentState(
  enrollments: { batchId: string; status: string; paymentStatus: string }[],
  batchId: string,
): EnrollmentUiState {
  const row = enrollments.find((e) => String(e.batchId) === String(batchId));
  if (!row) return "none";
  if (row.paymentStatus === "paid" && row.status === "active") return "enrolled";
  if (row.paymentStatus === "pending" && row.status === "pending") return "pending";
  return "none";
}

/** Live course enrollment state from course Enrollment rows + selectedBatchId. */
export function resolveLiveCourseBatchState(
  enrollments: {
    course: string;
    selectedBatchId?: string;
    batchId?: string;
    status: string;
    paymentStatus: string;
  }[],
  courseId: string,
  batchId: string,
): EnrollmentUiState {
  const row = enrollments.find(
    (e) =>
      String(e.course) === String(courseId) &&
      String(e.selectedBatchId ?? e.batchId ?? "") === String(batchId),
  );
  if (!row) return "none";
  if (
    row.paymentStatus === "paid" &&
    ["enrolled", "in_progress", "completed"].includes(String(row.status || ""))
  ) {
    return "enrolled";
  }
  if (row.paymentStatus === "pending") return "pending";
  return "none";
}

export function enrollmentButtonLabel(
  state: EnrollmentUiState,
  options?: { isFree?: boolean; loading?: boolean },
): string {
  if (options?.loading) return "Processing…";
  if (state === "enrolled") return "Enrolled";
  if (state === "pending") return "Pending enrollment";
  return options?.isFree ? "Enroll" : "Enroll & pay";
}
