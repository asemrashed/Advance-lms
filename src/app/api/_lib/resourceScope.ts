import Batch from "@/models/Batch";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import Lesson from "@/models/Lesson";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";
import {
  accessGrantingPaymentQuery,
  enrollmentGrantsAccess,
} from "@/lib/subscription/plan";
import { normalizeBatchGrade } from "@/lib/batchGrades";
import type { ResourceScopeType } from "@/types/resourceScope";

export type ParsedResourceScope = {
  scopeType: ResourceScopeType;
  batchId?: string;
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
};

export function parseScopeType(value: unknown): ResourceScopeType | null {
  if (value === "batch" || value === "course") return value;
  return null;
}

export function parseScopeIds(body: Record<string, unknown>): ParsedResourceScope | null {
  const scopeType = parseScopeType(body.scopeType);
  if (!scopeType) return null;

  const readId = (key: string) => {
    const raw = body[key];
    return typeof raw === "string" && isObjectId(raw.trim()) ? raw.trim() : undefined;
  };

  if (scopeType === "batch") {
    const batchId = readId("batchId");
    const chapterId = readId("chapterId") ?? readId("subjectModuleId");
    const lessonId = readId("lessonId") ?? readId("subjectLessonId");
    if (!batchId || !chapterId || !lessonId) {
      return null;
    }
    return { scopeType, batchId, chapterId, lessonId };
  }

  const courseId = readId("courseId");
  const chapterId = readId("chapterId");
  const lessonId = readId("lessonId");
  const batchId = readId("batchId");
  if (!courseId || !chapterId || !lessonId) return null;

  return { scopeType, courseId, chapterId, lessonId, batchId };
}

export async function resolveScopeLabels(scope: ParsedResourceScope) {
  if (scope.scopeType === "batch") {
    const [batch, chapter, lesson] = await Promise.all([
      Batch.findById(scope.batchId).select("name subject grade courseId").lean(),
      Chapter.findById(scope.chapterId).select("title subjectLabel").lean(),
      Lesson.findById(scope.lessonId).select("title").lean(),
    ]);

    const subjectLabel = chapter?.subjectLabel || batch?.subject || "Batch";
    const moduleLabel = chapter?.title || "Chapter";
    const lessonLabel = lesson?.title || "Lesson";

    return {
      subject: batch?.subject || batch?.name || "Batch",
      topic: `${subjectLabel} · ${moduleLabel} · ${lessonLabel}`,
      grade: batch?.grade ? normalizeBatchGrade(String(batch.grade)) : undefined,
    };
  }

  const [course, lesson] = await Promise.all([
    Course.findById(scope.courseId).select("title subjectName grade").lean(),
    Lesson.findById(scope.lessonId).select("title").lean(),
  ]);

  return {
    subject: course?.subjectName || course?.title || "Course",
    topic: lesson?.title || "Lesson",
    grade: course?.grade ? normalizeBatchGrade(String(course.grade)) : undefined,
  };
}

/**
 * Resolve the course a gated resource belongs to.
 * Prefer explicit courseId; otherwise parent course of batchId.
 */
export async function resolveResourceCourseId(row: {
  courseId?: unknown;
  batchId?: unknown;
}): Promise<string | null> {
  if (row.courseId && isObjectId(String(row.courseId))) {
    return String(row.courseId);
  }
  if (row.batchId && isObjectId(String(row.batchId))) {
    const batch = await Batch.findById(row.batchId).select("courseId").lean();
    if (batch?.courseId && isObjectId(String(batch.courseId))) {
      return String(batch.courseId);
    }
  }
  return null;
}

/**
 * Gated notes/worksheets: any student with an active paid enrollment
 * on that course may access (not limited to a single batch section).
 */
export async function studentCanAccessCourseScopedResource(
  studentId: string | undefined,
  courseId: string | undefined,
): Promise<boolean> {
  if (!studentId || !courseId || !isObjectId(courseId)) return false;

  const enrollment = await Enrollment.findOne({
    student: toObjectId(studentId),
    course: toObjectId(courseId),
    status: { $in: ["enrolled", "in_progress", "completed"] },
    accessBlocked: { $ne: true },
    ...accessGrantingPaymentQuery(),
  })
    .select("paymentStatus billingPlan accessExpiresAt accessBlocked paymentDueAt")
    .lean();

  return Boolean(enrollment && enrollmentGrantsAccess(enrollment));
}

/** Resolves batch → parent course, then applies course enrollment gate. */
export async function studentCanAccessBatchScopedResource(
  studentId: string | undefined,
  batchId: string | undefined,
): Promise<boolean> {
  if (!studentId || !batchId || !isObjectId(batchId)) return false;
  const courseId = await resolveResourceCourseId({ batchId });
  if (!courseId) return false;
  return studentCanAccessCourseScopedResource(studentId, courseId);
}

export async function assertBatchChapterLesson(
  batchId: string,
  chapterId: string,
  lessonId: string,
) {
  const chapter = await Chapter.findOne({
    _id: toObjectId(chapterId),
    batchId: toObjectId(batchId),
  })
    .select("_id course")
    .lean();
  if (!chapter) return null;

  const lesson = await Lesson.findOne({
    _id: toObjectId(lessonId),
    chapter: chapter._id,
    batchId: toObjectId(batchId),
  })
    .select("_id")
    .lean();
  if (!lesson) return null;

  return { chapter, lesson };
}

export function scopeFieldsToDoc(scope: ParsedResourceScope) {
  if (scope.scopeType === "batch") {
    return {
      scopeType: "batch" as const,
      batchId: toObjectId(scope.batchId!),
      chapterId: toObjectId(scope.chapterId!),
      lessonId: toObjectId(scope.lessonId!),
      courseId: undefined,
    };
  }

  return {
    scopeType: "course" as const,
    // Course curriculum worksheets are shared across batches — do not stamp batchId.
    batchId: undefined,
    courseId: toObjectId(scope.courseId!),
    chapterId: toObjectId(scope.chapterId!),
    lessonId: toObjectId(scope.lessonId!),
  };
}

export function mapScopeFromRow(row: Record<string, unknown>) {
  const scopeType =
    row.scopeType === "course"
      ? ("course" as const)
      : row.scopeType === "subject"
        ? ("subject" as const)
        : row.courseId
          ? ("course" as const)
          : row.batchId
            ? ("batch" as const)
            : ("subject" as const);

  const idOf = (key: string) => {
    const val = row[key];
    if (!val) return undefined;
    if (typeof val === "object" && val && "_id" in (val as object)) {
      return String((val as { _id: unknown })._id);
    }
    return String(val);
  };

  return {
    scopeType,
    batchId: idOf("batchId"),
    chapterId: idOf("chapterId"),
    lessonId: idOf("lessonId"),
    courseId: idOf("courseId"),
    batch: row.batchId,
    chapter: row.chapterId,
    lesson: row.lessonId,
    course: row.courseId,
  };
}

export async function resolveParsedScope(
  body: Record<string, unknown>,
): Promise<ParsedResourceScope | null> {
  const parsed = parseScopeIds(body);
  if (!parsed) return null;

  if (parsed.scopeType === "batch") {
    const ok = await assertBatchChapterLesson(
      parsed.batchId!,
      parsed.chapterId!,
      parsed.lessonId!,
    );
    if (!ok) return null;
  } else if (parsed.courseId) {
    const chapter = await Chapter.findOne({
      _id: toObjectId(parsed.chapterId!),
      course: toObjectId(parsed.courseId),
    })
      .select("_id")
      .lean();
    if (!chapter) return null;

    const lesson = await Lesson.findOne({
      _id: toObjectId(parsed.lessonId!),
      chapter: chapter._id,
      course: toObjectId(parsed.courseId),
    })
      .select("_id")
      .lean();
    if (!lesson) return null;

    if (parsed.batchId) {
      const batch = await Batch.findOne({
        _id: toObjectId(parsed.batchId),
        courseId: toObjectId(parsed.courseId),
      })
        .select("_id")
        .lean();
      if (!batch) return null;
    }
  }

  return parsed;
}

export async function pickScopeUpdate(body: Record<string, unknown>) {
  const parsed = await resolveParsedScope(body);
  if (!parsed) return {};
  return scopeFieldsToDoc(parsed);
}
