export type ResourceCenterAccess = {
  fullAccess: boolean;
  batchEnrolled: boolean;
  courseEnrolled?: boolean;
  freeLimit: number;
  enrolledLimit?: number;
};

export type ResourceBrowseStats = {
  total: number;
  batchGated: number;
  locked: number;
};
