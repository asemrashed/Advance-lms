import PlatformQuestion from "@/models/PlatformQuestion";
import Subject from "@/models/Subject";
import Batch from "@/models/Batch";
import Chapter from "@/models/Chapter";
import Lesson from "@/models/Lesson";
import { instructorBatchFilter } from "@/app/api/_lib/batchAccess";
import {
  buildInstructorPlatformQuestionScope,
  instructorCanViewAdminQuestion,
} from "@/app/api/_lib/platformQuestionAccess";
import type { SessionUser } from "@/app/api/_lib/phase12";
import { normalizeSubjectChapters } from "@/lib/subjectChapters";
import { normalizeSubjectComponents } from "@/lib/subjectComponents";
import {
  isObjectId,
  pagination,
  parseLimit,
  parsePage,
  toObjectId,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import { hasQuestionBody } from "@/lib/math/asciiToLatex";
import {
  isPlatformQuestionInTestYourself,
  TEST_YOURSELF_VISIBLE_FILTER,
} from "@/lib/resources/testYourself";
import { repairCourseTopicOverwrites } from "@/app/api/_lib/testYourselfTests";
import { resolveGradeQueryValue } from "@/lib/batchGrades";
import { isAdminAreaRole } from "@/lib/roles";

export function serializePlatformQuestion(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: String(doc._id),
    ownerId: doc.ownerId ? String(doc.ownerId) : undefined,
    subjectId: doc.subjectId ? String(doc.subjectId) : undefined,
    componentId: doc.componentId ? String(doc.componentId) : undefined,
    sourceFileId: doc.sourceFileId ? String(doc.sourceFileId) : undefined,
    sourcePdfPublicId: doc.sourcePdfPublicId
      ? String(doc.sourcePdfPublicId)
      : undefined,
    inTestYourself: isPlatformQuestionInTestYourself({
      isActive: doc.isActive as boolean | undefined,
      accessPolicy: doc.accessPolicy as string | undefined,
    }),
  };
}

/** Admin: all; instructor: own + admin QB when approved grant is active (expiresAt enforced). */
export async function buildPlatformQuestionScopeFilter(
  user: SessionUser,
): Promise<Record<string, unknown>> {
  if (isAdminAreaRole(user.role)) return {};
  return buildInstructorPlatformQuestionScope(user.id);
}

export async function buildPlatformQuestionListFilter(
  user: SessionUser,
  searchParams: URLSearchParams,
): Promise<Record<string, unknown>> {
  const scope = await buildPlatformQuestionScopeFilter(user);
  const filter: Record<string, unknown> = { ...scope };

  const search = (searchParams.get("search") || "").trim();
  const subject = (searchParams.get("subject") || "").trim();
  const subjectCode = (searchParams.get("subjectCode") || "").trim();
  const grade = (searchParams.get("grade") || "").trim();
  const topic = (searchParams.get("topic") || "").trim();
  const subtopic = (searchParams.get("subtopic") || "").trim();
  const difficulty = (searchParams.get("difficulty") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const accessPolicy = (searchParams.get("accessPolicy") || "").trim();
  const sourceType = (searchParams.get("sourceType") || "").trim();
  const questionFormat = (searchParams.get("questionFormat") || "").trim();
  const componentId = (searchParams.get("componentId") || "").trim();
  const session = (searchParams.get("session") || "").trim();
  const paper = (searchParams.get("paper") || "").trim();
  const year = (searchParams.get("year") || "").trim();
  const topicNumber = (searchParams.get("topicNumber") || "").trim();
  const completeness = (searchParams.get("completeness") || "").trim();
  const testYourself = (searchParams.get("testYourself") || "").trim();
  const chapterId = (searchParams.get("chapterId") || "").trim();
  const lessonId = (searchParams.get("lessonId") || "").trim();
  const subjectModuleId = (searchParams.get("subjectModuleId") || "").trim();
  const subjectLessonId = (searchParams.get("subjectLessonId") || "").trim();
  const batchClassId = (searchParams.get("batchClassId") || "").trim();

  if (search) {
    const safe = escapeRegex(search);
    const searchClause = {
      $or: [
        { questionText: { $regex: safe, $options: "i" } },
        { answerText: { $regex: safe, $options: "i" } },
        { tags: { $elemMatch: { $regex: safe, $options: "i" } } },
      ],
    };
    if (scope.$or) {
      filter.$and = [{ $or: scope.$or as unknown[] }, searchClause];
      delete filter.$or;
    } else {
      Object.assign(filter, searchClause);
    }
  }
  if (subject) {
    filter.subject = {
      $regex: `^${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    };
  }
  if (subjectCode) filter.subjectCode = subjectCode.toUpperCase();
  if (grade) {
    const gradeMatch = resolveGradeQueryValue(grade);
    if (gradeMatch) filter.grade = gradeMatch;
  }
  if (topic) {
    filter.topic = {
      $regex: `^${topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    };
  }
  if (subtopic) filter.subtopic = subtopic;
  if (difficulty && ["1", "2", "3"].includes(difficulty)) {
    filter.difficulty = Number.parseInt(difficulty, 10);
  }
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;
  if (
    accessPolicy &&
    ["private", "shared_with_instructors", "public"].includes(accessPolicy)
  ) {
    filter.accessPolicy = accessPolicy;
  }
  if (testYourself === "1" || testYourself === "true") {
    Object.assign(filter, TEST_YOURSELF_VISIBLE_FILTER);
  }
  if (["manual", "claude", "pdf", "pastpaper"].includes(sourceType)) {
    filter.sourceType = sourceType;
  }
  if (questionFormat === "mcq" || questionFormat === "written") {
    filter.questionFormat = questionFormat;
  }
  if (componentId && isObjectId(componentId)) {
    filter.componentId = toObjectId(componentId);
  }
  if (["FM", "MJ", "ON"].includes(session)) filter.session = session;
  if (paper) filter.paper = paper;
  if (year && /^\d{4}$/.test(year)) filter.year = Number.parseInt(year, 10);
  if (topicNumber && /^\d+$/.test(topicNumber)) {
    filter.topicNumber = Number.parseInt(topicNumber, 10);
  }
  if (completeness === "complete" || completeness === "incomplete") {
    filter.status = completeness;
  }
  if (chapterId && isObjectId(chapterId)) {
    filter.chapterId = toObjectId(chapterId);
  }
  if (lessonId && isObjectId(lessonId)) {
    filter.lessonId = toObjectId(lessonId);
  }
  if (subjectModuleId && isObjectId(subjectModuleId)) {
    filter.chapterId = toObjectId(subjectModuleId);
  }
  if (subjectLessonId && isObjectId(subjectLessonId)) {
    filter.lessonId = toObjectId(subjectLessonId);
  }
  if (batchClassId && isObjectId(batchClassId)) {
    filter.chapterId = toObjectId(batchClassId);
  }
  const idsParam = (searchParams.get("ids") || "").trim();
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => isObjectId(id))
      .map((id) => toObjectId(id));
    filter._id = { $in: ids };
  }

  return filter;
}

export async function listPlatformQuestions(
  user: SessionUser,
  searchParams: URLSearchParams,
) {
  const page = parsePage(searchParams);
  const idsParam = (searchParams.get("ids") || "").trim();
  const limit = parseLimit(searchParams, 12, idsParam ? 200 : 100);
  const skip = (page - 1) * limit;
  const sortBy = (searchParams.get("sortBy") || "createdAt").trim();
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const allowedSort = new Set([
    "createdAt",
    "updatedAt",
    "subject",
    "topic",
    "difficulty",
  ]);
  const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

  const filter = await buildPlatformQuestionListFilter(user, searchParams);

  const [rows, total] = await Promise.all([
    PlatformQuestion.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    PlatformQuestion.countDocuments(filter),
  ]);

  return {
    questions: rows.map((r) =>
      serializePlatformQuestion(r as Record<string, unknown>),
    ),
    pagination: pagination(page, limit, total),
  };
}

type SubjectTopicEntry = {
  topic: string;
  count: number;
  testYourselfCount: number;
};

async function mergeBatchCurriculumSubjects(
  user: SessionUser,
  subjectMap: Map<string, SubjectTopicEntry[]>,
  resolveSubjectLabel: (raw: string) => string = (raw) => raw.trim(),
) {
  const batchFilter: Record<string, unknown> = { isActive: { $ne: false } };
  if (user.role === "instructor") {
    Object.assign(batchFilter, instructorBatchFilter(user.id));
  } else if (!isAdminAreaRole(user.role)) {
    return;
  }

  const batches = await Batch.find(batchFilter).select("_id").lean();
  const batchIds = batches.map((b) => b._id);
  if (!batchIds.length) return;

  const chapters = await Chapter.find({
    batchId: { $in: batchIds },
  })
    .select("title subjectLabel _id")
    .lean();

  if (!chapters.length) return;

  const chapterIds = chapters.map((c) => c._id);
  const lessons = await Lesson.find({
    chapter: { $in: chapterIds },
  })
    .select("title chapter")
    .lean();

  const subjectByChapter = new Map(
    chapters.map((c) => [
      String(c._id),
      resolveSubjectLabel(String(c.subjectLabel ?? c.title ?? "")),
    ]),
  );

  const ensureTopic = (subject: string, topic: string) => {
    const label = resolveSubjectLabel(subject);
    if (!label) return;
    const key = label.toLowerCase();
    const list = subjectMap.get(key) ?? [];
    if (topic && !list.some((t) => t.topic.toLowerCase() === topic.toLowerCase())) {
      list.push({ topic, count: 0, testYourselfCount: 0 });
    }
    subjectMap.set(key, list);
  };

  for (const ch of chapters) {
    const subject = resolveSubjectLabel(String(ch.subjectLabel ?? ch.title ?? ""));
    ensureTopic(subject, "");
  }

  for (const lesson of lessons) {
    const subject = subjectByChapter.get(String(lesson.chapter)) ?? "";
    const topic = String(lesson.title ?? "").trim();
    ensureTopic(subject, topic);
  }
}

export async function getPlatformQuestionSubjects(user: SessionUser) {
  // Collapse duplicate subject casings + restore topics overwritten to "Course".
  await repairCourseTopicOverwrites();

  const scope = await buildPlatformQuestionScopeFilter(user);
  const rows = await PlatformQuestion.aggregate([
    { $match: scope },
    {
      $group: {
        _id: { subject: "$subject", topic: "$topic" },
        count: { $sum: 1 },
        testYourselfCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$accessPolicy", "public"] },
                  { $ne: ["$isActive", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { "_id.subject": 1, "_id.topic": 1 } },
  ]);

  const registered = await Subject.find({ isActive: { $ne: false } })
    .sort({ name: 1 })
    .lean();

  /** Prefer canonical Subject registry names when merging case/spacing variants. */
  const canonicalByKey = new Map<string, string>();
  for (const row of registered) {
    const name = String(row.name || "").trim();
    if (!name) continue;
    canonicalByKey.set(name.toLowerCase(), name);
  }

  const resolveSubjectLabel = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    return canonicalByKey.get(trimmed.toLowerCase()) || trimmed;
  };

  const subjectMap = new Map<string, SubjectTopicEntry[]>();
  const mergeTopic = (
    subjectLabel: string,
    topic: string,
    count = 0,
    testYourselfCount = 0,
  ) => {
    if (!subjectLabel) return;
    const key = subjectLabel.toLowerCase();
    const list = subjectMap.get(key) || [];
    if (topic) {
      const existing = list.find(
        (t) => t.topic.toLowerCase() === topic.toLowerCase(),
      );
      if (existing) {
        existing.count += count;
        existing.testYourselfCount += testYourselfCount;
      } else {
        list.push({ topic, count, testYourselfCount });
      }
    }
    subjectMap.set(key, list);
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, subjectLabel);
  };

  for (const row of rows) {
    const subject = resolveSubjectLabel(String(row._id?.subject || ""));
    const topic = String(row._id?.topic || "").trim();
    if (!subject) continue;
    mergeTopic(
      subject,
      topic,
      row.count as number,
      row.testYourselfCount as number,
    );
  }

  await mergeBatchCurriculumSubjects(user, subjectMap, resolveSubjectLabel);

  // Only keep subjects that exist in the Subject registry (canonical).
  const registeredKeys = new Set(
    registered.map((row) => String(row.name || "").trim().toLowerCase()).filter(Boolean),
  );

  for (const row of registered) {
    const name = String(row.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const list = subjectMap.get(key) || [];
    const chapters = normalizeSubjectChapters(
      (row as { chapters?: unknown }).chapters,
    );
    for (const ch of chapters) {
      if (!list.some((t) => t.topic.toLowerCase() === ch.name.toLowerCase())) {
        list.push({ topic: ch.name, count: 0, testYourselfCount: 0 });
      }
    }
    subjectMap.set(key, list);
    canonicalByKey.set(key, name);
  }

  return {
    subjects: Array.from(subjectMap.entries())
      .map(([key, topics]) => {
        const subjectLabel = canonicalByKey.get(key) || key;
        const registeredRow = registered.find(
          (row) => String(row.name || "").trim().toLowerCase() === key,
        );
        const components = normalizeSubjectComponents(
          (registeredRow as { components?: unknown } | undefined)?.components,
        ).map((c) => ({
          _id: String(c._id || ""),
          name: c.name,
          type: c.type,
          order: c.order,
        }));
        return {
          subject: subjectLabel,
          subjectId: registeredRow ? String(registeredRow._id) : undefined,
          subjectCode: registeredRow
            ? String(registeredRow.code || "")
            : undefined,
          grade: registeredRow?.grade
            ? String(registeredRow.grade)
            : undefined,
          components,
          topics: topics
            .filter((t) => t.topic && t.topic.toLowerCase() !== "course")
            .sort((a, b) => a.topic.localeCompare(b.topic)),
        };
      })
      .filter((node) => registeredKeys.has(node.subject.trim().toLowerCase()))
      .sort((a, b) => a.subject.localeCompare(b.subject)),
  };
}

export async function getPlatformQuestionTestYourselfSummary(user: SessionUser) {
  const scope = await buildPlatformQuestionScopeFilter(user);
  const filter = { ...scope, ...TEST_YOURSELF_VISIBLE_FILTER };

  const [total, topicRows] = await Promise.all([
    PlatformQuestion.countDocuments(filter),
    PlatformQuestion.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { subject: "$subject", topic: "$topic" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.subject": 1, "_id.topic": 1 } },
    ]),
  ]);

  const topics = topicRows.map((row) => ({
    subject: String(row._id?.subject ?? "").trim(),
    topic: String(row._id?.topic ?? "").trim(),
    questionCount: row.count as number,
  }));

  return {
    total,
    topicCount: topics.length,
    subjects: [...new Set(topics.map((t) => t.subject).filter(Boolean))].sort(),
    topics,
  };
}

export async function getPastPaperStats(user: SessionUser) {
  const scope = await buildPlatformQuestionScopeFilter(user);
  const match = { ...scope, sourceType: "pastpaper" };

  const [totals, bySession, byYear, byTopic] = await Promise.all([
    PlatformQuestion.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          complete: {
            $sum: { $cond: [{ $eq: ["$status", "complete"] }, 1, 0] },
          },
          incomplete: {
            $sum: { $cond: [{ $eq: ["$status", "incomplete"] }, 1, 0] },
          },
        },
      },
    ]),
    PlatformQuestion.aggregate([
      { $match: match },
      { $group: { _id: "$session", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    PlatformQuestion.aggregate([
      { $match: match },
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),
    PlatformQuestion.aggregate([
      { $match: match },
      {
        $group: {
          _id: { topicNumber: "$topicNumber", topic: "$topic" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.topicNumber": 1 } },
    ]),
  ]);

  const t = totals[0] || { total: 0, complete: 0, incomplete: 0 };
  return {
    total: t.total as number,
    complete: t.complete as number,
    incomplete: t.incomplete as number,
    bySession: bySession
      .filter((r) => r._id)
      .map((r) => ({ session: String(r._id), count: r.count as number })),
    byYear: byYear
      .filter((r) => r._id != null)
      .map((r) => ({ year: Number(r._id), count: r.count as number })),
    byTopic: byTopic
      .filter((r) => r._id?.topicNumber != null)
      .map((r) => ({
        topicNumber: Number(r._id.topicNumber),
        topic: String(r._id.topic || ""),
        count: r.count as number,
      })),
  };
}

export function instructorOwnsQuestion(
  user: SessionUser,
  doc: { ownerId?: unknown },
): boolean {
  return String(doc.ownerId) === user.id;
}

export async function canViewPlatformQuestion(
  user: SessionUser,
  questionId: string,
): Promise<{ ok: boolean; doc: Record<string, unknown> | null; readOnly?: boolean }> {
  if (!isObjectId(questionId)) return { ok: false, doc: null };
  const doc = await PlatformQuestion.findById(questionId).lean();
  if (!doc) return { ok: false, doc: null };
  if (isAdminAreaRole(user.role)) {
    return { ok: true, doc: doc as Record<string, unknown> };
  }
  if (user.role === "instructor") {
    if (instructorOwnsQuestion(user, doc)) {
      return { ok: true, doc: doc as Record<string, unknown> };
    }
    if (doc.ownerType === "admin") {
      const allowed = await instructorCanViewAdminQuestion(user.id, {
        ownerType: String(doc.ownerType || ""),
        subjectId: doc.subjectId,
        subjectCode: doc.subjectCode ? String(doc.subjectCode) : undefined,
        subject: doc.subject ? String(doc.subject) : undefined,
        grade: doc.grade ? String(doc.grade) : undefined,
        topic: doc.topic ? String(doc.topic) : undefined,
      });
      if (allowed) {
        return { ok: true, doc: doc as Record<string, unknown>, readOnly: true };
      }
    }
  }
  return { ok: false, doc: null };
}

export async function canMutatePlatformQuestion(
  user: SessionUser,
  questionId: string,
): Promise<{ ok: boolean; doc: Record<string, unknown> | null }> {
  const view = await canViewPlatformQuestion(user, questionId);
  if (!view.ok || !view.doc) return { ok: false, doc: null };
  if (view.readOnly) return { ok: false, doc: null };
  return { ok: true, doc: view.doc };
}

export function parseCreatePlatformQuestionBody(
  body: Record<string, unknown>,
  user: SessionUser,
) {
  const subject = String(body.subject || "").trim();
  const subjectId = body.subjectId ? String(body.subjectId).trim() : undefined;
  const subjectCode = body.subjectCode
    ? String(body.subjectCode).trim().toUpperCase()
    : undefined;
  const grade = body.grade ? String(body.grade).trim().toUpperCase() : undefined;
  const componentId = body.componentId ? String(body.componentId).trim() : undefined;
  const topic = String(body.topic || "").trim();
  const subtopic = body.subtopic ? String(body.subtopic).trim() : undefined;
  const questionText = String(body.questionText || "").trim();
  const difficulty = Number(body.difficulty);
  const options = Array.isArray(body.options) ? body.options : [];
  const requestedFormat = String(body.questionFormat || "").trim();
  const questionFormat =
    requestedFormat === "written" ? "written" : ("mcq" as const);
  const answerText = body.answerText ? String(body.answerText).trim() : undefined;
  const explanation = body.explanation ? String(body.explanation).trim() : undefined;
  const hasDiagram = Boolean(body.hasDiagram);
  const diagramUrl = body.diagramUrl ? String(body.diagramUrl).trim() : undefined;
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const isActive = body.isActive !== false;

  const curriculumRefs: Record<string, unknown> = {};
  const refFields = [
    "batchId",
    "batchClassId",
    "subjectModuleId",
    "subjectLessonId",
    "courseId",
    "chapterId",
    "lessonId",
  ] as const;
  for (const key of refFields) {
    const val = body[key];
    if (val && isObjectId(String(val))) {
      curriculumRefs[key] = toObjectId(String(val));
    }
  }

  let accessPolicy = String(body.accessPolicy || "private");
  if (
    !["private", "shared_with_instructors", "public"].includes(accessPolicy)
  ) {
    accessPolicy = "private";
  }
  if (user.role === "instructor") {
    accessPolicy = "private";
  }

  return {
    subject,
    subjectId,
    subjectCode,
    grade,
    componentId,
    topic,
    subtopic,
    questionFormat,
    questionText,
    difficulty,
    options,
    answerText,
    explanation,
    marks: Number(body.marks || 0) || undefined,
    hasDiagram,
    diagramUrl,
    tags,
    isActive,
    accessPolicy: accessPolicy as "private" | "shared_with_instructors" | "public",
    ownerType: user.role as "admin" | "instructor",
    ownerId: toObjectId(user.id),
    sourceType: "manual" as const,
    aiGenerated: false,
    ...curriculumRefs,
  };
}

export function validatePlatformQuestionPayload(payload: {
  subject?: string;
  componentId?: unknown;
  topic?: string;
  questionText?: string;
  difficulty?: number;
  questionFormat?: string;
  options?: { text?: string; isCorrect?: boolean }[];
}) {
  const errors: string[] = [];
  if (!payload.subject) errors.push("Subject is required");
  if (!payload.componentId) errors.push("Exam component is required");
  if (!hasQuestionBody(payload.questionText || "")) errors.push("Question text is required");
  if (![1, 2, 3].includes(Number(payload.difficulty))) errors.push("Difficulty must be 1, 2, or 3");
  if (payload.questionFormat === "written") return errors;
  const validOptions = (payload.options || []).filter(
    (o) => String(o?.text || "").trim(),
  );
  if (validOptions.length < 2) errors.push("At least two options are required");
  const hasCorrect = validOptions.some((o) => o.isCorrect);
  if (!hasCorrect) errors.push("Mark at least one option as correct");
  return errors;
}

/**
 * Resolve subject + component and force questionFormat from component type.
 */
export async function enrichPlatformQuestionWithComponent(
  payload: ReturnType<typeof parseCreatePlatformQuestionBody>,
) {
  const { resolveSubjectComponent } = await import("@/app/api/_lib/subjects");
  const resolved = await resolveSubjectComponent({
    subjectId: payload.subjectId,
    subjectName: payload.subject,
    subjectCode: payload.subjectCode,
    componentId: payload.componentId,
  });
  if ("error" in resolved) {
    return { error: resolved.error };
  }

  return {
    payload: {
      ...payload,
      subject: resolved.subjectName || payload.subject,
      subjectId: toObjectId(resolved.subjectId),
      subjectCode: resolved.subjectCode || payload.subjectCode,
      componentId: toObjectId(resolved.component._id!),
      componentName: resolved.component.name,
      componentType: resolved.component.type,
      questionFormat: resolved.component.type,
      options:
        resolved.component.type === "written"
          ? []
          : payload.options,
    },
  };
}
