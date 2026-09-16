export type ResourceCourseKind = "live" | "recorded";

/** Stored API scope — always course-level curriculum; batchId optional for live. */
export type ResourceScopeType = "batch" | "course";

export type ResourceScopeValue = {
  /** UI: live vs recorded course picker */
  courseKind: ResourceCourseKind;
  courseId?: string;
  /** Optional live section — used by instructor materials (T3). */
  batchId?: string;
  chapterId?: string;
  lessonId?: string;
  subjectName?: string;
  subjectCode?: string;
  grade?: string;
};

export const emptyResourceScope: ResourceScopeValue = {
  courseKind: "live",
};

/** Payload sent to resource APIs */
export type ResourceScopePayload = {
  scopeType: "course";
  courseId: string;
  chapterId: string;
  lessonId: string;
  subject?: string;
  grade?: string;
};

export function toResourceScopePayload(
  scope: ResourceScopeValue,
): ResourceScopePayload | null {
  if (!scope.courseId || !scope.chapterId || !scope.lessonId) return null;
  return {
    scopeType: "course",
    courseId: scope.courseId,
    chapterId: scope.chapterId,
    lessonId: scope.lessonId,
    subject: scope.subjectName,
    grade: scope.grade,
  };
}

export function isResourceScopeComplete(scope: ResourceScopeValue): boolean {
  return Boolean(scope.courseId && scope.chapterId && scope.lessonId);
}
