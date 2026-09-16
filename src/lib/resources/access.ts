/** Defaults for Test Yourself sampling (instructor can override per subject test). */
export const TEST_YOURSELF_FREE_LIMIT = 5;
export const TEST_YOURSELF_ENROLLED_LIMIT = 12;
/** Public topic-wise dropdown: topic must have at least this many TY-public questions. */
export const TEST_YOURSELF_PUBLIC_TOPIC_MIN = 3;

export type ResourceCenterAccess = {
  fullAccess: boolean;
  /** Active paid batch enrollment. */
  batchEnrolled: boolean;
  /** Active paid course (recorded) enrollment. */
  courseEnrolled: boolean;
  freeLimit: number;
  enrolledLimit?: number;
};

export const DEFAULT_RESOURCE_ACCESS: ResourceCenterAccess = {
  fullAccess: false,
  batchEnrolled: false,
  courseEnrolled: false,
  freeLimit: TEST_YOURSELF_FREE_LIMIT,
  enrolledLimit: TEST_YOURSELF_ENROLLED_LIMIT,
};
