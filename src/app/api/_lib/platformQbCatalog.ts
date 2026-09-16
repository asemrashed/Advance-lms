import PlatformQuestion from "@/models/PlatformQuestion";
import Subject from "@/models/Subject";
import {
  PLATFORM_QB_ACCESS_FEE,
  isPlatformQbPaidAccessEnabled,
} from "@/lib/platformQbAccess";
import {
  pagination,
  parseLimit,
  parsePage,
  isObjectId,
  toObjectId,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import { resolveGradeQueryValue } from "@/lib/batchGrades";

/** Admin-owned active platform questions used as the borrowable catalog. */
const CATALOG_BASE: Record<string, unknown> = {
  ownerType: "admin",
  isActive: { $ne: false },
};

function applyCatalogFilters(
  searchParams: URLSearchParams,
  base: Record<string, unknown> = { ...CATALOG_BASE },
) {
  const filter = { ...base };
  const grade = (searchParams.get("grade") || "").trim();
  const subject = (searchParams.get("subject") || "").trim();
  const subjectCode = (searchParams.get("subjectCode") || "").trim();
  const subjectId = (searchParams.get("subjectId") || "").trim();
  const topic = (searchParams.get("topic") || "").trim();
  const search = (searchParams.get("search") || "").trim();

  if (grade && grade !== "all") {
    const gradeMatch = resolveGradeQueryValue(grade);
    if (gradeMatch) filter.grade = gradeMatch;
  }
  if (subjectId && isObjectId(subjectId)) filter.subjectId = toObjectId(subjectId);
  else if (subjectCode) filter.subjectCode = subjectCode.toUpperCase();
  else if (subject) filter.subject = subject;
  if (topic) filter.topic = topic;
  if (search) {
    const safe = escapeRegex(search);
    filter.$and = [
      {
        $or: [
          { subject: { $regex: safe, $options: "i" } },
          { subjectCode: { $regex: safe, $options: "i" } },
          { topic: { $regex: safe, $options: "i" } },
          { questionText: { $regex: safe, $options: "i" } },
        ],
      },
    ];
  }
  return filter;
}

/**
 * Paginated subject catalog for Borrow / Give Access.
 * Each row: title, code, grade, totalTopics, totalQuestions, accessPrice.
 */
export async function listBorrowCatalogSubjects(searchParams: URLSearchParams) {
  const page = parsePage(searchParams);
  const limit = parseLimit(searchParams, 15, 50);
  const skip = (page - 1) * limit;
  const grade = (searchParams.get("grade") || "").trim();
  const search = (searchParams.get("search") || "").trim();
  const subjectCode = (searchParams.get("subjectCode") || "").trim();
  const subjectName = (searchParams.get("subject") || searchParams.get("subjectName") || "").trim();

  const subjectFilter: Record<string, unknown> = { isActive: { $ne: false } };
  if (grade && grade !== "all") {
    const gradeMatch = resolveGradeQueryValue(grade);
    if (gradeMatch) subjectFilter.grade = gradeMatch;
  }
  if (subjectCode) subjectFilter.code = subjectCode.toUpperCase();
  if (subjectName) {
    const safe = escapeRegex(subjectName);
    subjectFilter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { code: { $regex: safe, $options: "i" } },
    ];
  } else if (search) {
    const safe = escapeRegex(search);
    subjectFilter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { code: { $regex: safe, $options: "i" } },
    ];
  }

  const [subjects, total] = await Promise.all([
    Subject.find(subjectFilter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Subject.countDocuments(subjectFilter),
  ]);

  const catalog = await Promise.all(
    subjects.map(async (sub) => {
      const qFilter: Record<string, unknown> = {
        ...CATALOG_BASE,
        $or: [
          { subjectId: sub._id },
          { subjectCode: String(sub.code || "").toUpperCase() },
          { subject: sub.name },
        ],
      };
      if (sub.grade) {
        // Prefer matching grade when subject has one, but don't exclude unmatched grades silently.
      }

      const [totalQuestions, topicAgg] = await Promise.all([
        PlatformQuestion.countDocuments(qFilter),
        PlatformQuestion.aggregate([
          { $match: qFilter },
          { $group: { _id: "$topic" } },
          { $count: "n" },
        ]),
      ]);

      const totalTopics = topicAgg[0]?.n ?? 0;
      const accessPrice =
        sub.qbAccessPrice != null && Number.isFinite(Number(sub.qbAccessPrice))
          ? Number(sub.qbAccessPrice)
          : PLATFORM_QB_ACCESS_FEE;

      return {
        _id: String(sub._id),
        title: String(sub.name || ""),
        subjectCode: String(sub.code || ""),
        grade: sub.grade ? String(sub.grade) : undefined,
        totalTopics,
        totalQuestions,
        accessPrice,
      };
    }),
  );

  return {
    subjects: catalog,
    pagination: pagination(page, limit, total),
    paidAccessEnabled: isPlatformQbPaidAccessEnabled(),
    fullPlatformFee: PLATFORM_QB_ACCESS_FEE,
  };
}

/** Topics under a subject (paginated, default 15). */
export async function listBorrowCatalogTopics(searchParams: URLSearchParams) {
  const page = parsePage(searchParams);
  const limit = parseLimit(searchParams, 15, 50);
  const skip = (page - 1) * limit;
  const filter = applyCatalogFilters(searchParams);

  const topicSearch = (searchParams.get("topicSearch") || "").trim();

  const matchStage: Record<string, unknown> = { ...filter };
  if (topicSearch) {
    matchStage.topic = { $regex: escapeRegex(topicSearch), $options: "i" };
  }

  const [agg, countAgg] = await Promise.all([
    PlatformQuestion.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$topic",
          totalQuestions: { $sum: 1 },
          sharedPreviewCount: {
            $sum: {
              $cond: [
                {
                  $in: ["$accessPolicy", ["shared_with_instructors", "public"]],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    PlatformQuestion.aggregate([
      { $match: matchStage },
      { $group: { _id: "$topic" } },
      { $count: "n" },
    ]),
  ]);

  const total = countAgg[0]?.n ?? 0;
  const topics = agg.map((row: { _id: string; totalQuestions: number; sharedPreviewCount: number }) => ({
    topic: String(row._id || ""),
    totalQuestions: row.totalQuestions,
    sharedPreviewCount: row.sharedPreviewCount,
  }));

  return {
    topics,
    pagination: pagination(page, limit, total),
  };
}

/**
 * Question preview list — only rows where admin set privacy to shared/public.
 * Default page size 20.
 */
export async function listBorrowCatalogQuestions(searchParams: URLSearchParams) {
  const page = parsePage(searchParams);
  const limit = parseLimit(searchParams, 20, 50);
  const skip = (page - 1) * limit;

  const filter = applyCatalogFilters(searchParams, {
    ...CATALOG_BASE,
    accessPolicy: { $in: ["shared_with_instructors", "public"] },
  });

  const [rows, total] = await Promise.all([
    PlatformQuestion.find(filter)
      .select(
        "subject subjectCode grade topic difficulty questionFormat questionText options answerText explanation accessPolicy hasDiagram",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PlatformQuestion.countDocuments(filter),
  ]);

  const questions = rows.map((q) => ({
    _id: String(q._id),
    subject: String(q.subject || ""),
    subjectCode: q.subjectCode ? String(q.subjectCode) : undefined,
    grade: q.grade ? String(q.grade) : undefined,
    topic: String(q.topic || ""),
    difficulty: q.difficulty,
    questionFormat: q.questionFormat,
    questionText: String(q.questionText || ""),
    // Preview: hide correct answers for privacy — show options without isCorrect for MCQ.
    options: Array.isArray(q.options)
      ? q.options.map((o: { text?: string }) => ({ text: String(o.text || "") }))
      : [],
    hasExplanation: Boolean(q.explanation),
    hasDiagram: Boolean(q.hasDiagram),
    accessPolicy: q.accessPolicy,
  }));

  return {
    questions,
    pagination: pagination(page, limit, total),
  };
}
