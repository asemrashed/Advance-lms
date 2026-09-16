import PlatformQuestion from "@/models/PlatformQuestion";
import TestYourselfAttempt from "@/models/TestYourselfAttempt";
import TestYourselfTest from "@/models/TestYourselfTest";
import { resolveResourceCenterAccess } from "@/app/api/_lib/resourceAccess";
import {
  buildTestYourselfQuestionFilter,
  getTestYourselfTestBySubjectTopic,
} from "@/app/api/_lib/testYourselfTests";
import {
  buildInheritedPrivateQuestionMatch,
  listStudentInheritedPrivateQbGrants,
  type StudentPrivateQbGrant,
} from "@/app/api/_lib/studentPrivateQbAccess";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";
import {
  TEST_YOURSELF_ENROLLED_LIMIT,
  TEST_YOURSELF_FREE_LIMIT,
  TEST_YOURSELF_PUBLIC_TOPIC_MIN,
} from "@/lib/resources/access";
import { TEST_YOURSELF_VISIBLE_FILTER } from "@/lib/resources/testYourself";
import {
  formatTestYourselfName,
  isCourseLevelTestTopic,
  TEST_YOURSELF_COURSE_TOPIC,
} from "@/lib/resources/testYourselfTestName";
import type {
  TestYourselfAttemptMode,
  TestYourselfAttemptRow,
  TestYourselfSubjectCard,
} from "@/types/testYourself";
import { resolveGradeQueryValue } from "@/lib/batchGrades";
import { isAdminAreaRole } from "@/lib/roles";

export type TestYourselfAccessInfo = {
  fullAccess: boolean;
  freeLimit: number;
  enrolledLimit: number;
  userId?: string;
  role?: string;
  privateGrants?: StudentPrivateQbGrant[];
};

export type ListQuestionsOptions = {
  mode: TestYourselfAttemptMode;
  topic?: string;
  difficulty?: number | "all";
};

function clampLimit(value: unknown, fallback: number, max = 200) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function resolveTestYourselfAccess(
  userId?: string,
  role?: string,
): Promise<TestYourselfAccessInfo> {
  const access = await resolveResourceCenterAccess(userId, role);
  const info: TestYourselfAccessInfo = {
    fullAccess: access.fullAccess,
    freeLimit: access.freeLimit ?? TEST_YOURSELF_FREE_LIMIT,
    enrolledLimit: access.enrolledLimit ?? TEST_YOURSELF_ENROLLED_LIMIT,
    userId,
    role,
  };

  if (access.fullAccess && userId && role === "student") {
    info.privateGrants = await listStudentInheritedPrivateQbGrants(userId);
  } else if (access.fullAccess && (isAdminAreaRole(role) || role === "instructor")) {
    info.privateGrants = [];
  }

  return info;
}

/** Prefer course-level subject test config, else any topic row for that subject. */
export async function resolveSubjectQuestionLimits(subject: string) {
  const trimmed = subject.trim();
  const courseLevel = await getTestYourselfTestBySubjectTopic(
    trimmed,
    TEST_YOURSELF_COURSE_TOPIC,
  );
  if (courseLevel) {
    return {
      freeLimit: clampLimit(courseLevel.freeQuestionLimit, TEST_YOURSELF_FREE_LIMIT),
      enrolledLimit: clampLimit(
        courseLevel.enrolledQuestionLimit,
        TEST_YOURSELF_ENROLLED_LIMIT,
      ),
      courseId: courseLevel.courseId,
      name: courseLevel.name || trimmed,
    };
  }

  const any = await TestYourselfTest.findOne({
    subject: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    isActive: { $ne: false },
    isPublished: { $ne: false },
  })
    .sort({ topic: 1 })
    .lean();

  if (any) {
    return {
      freeLimit: clampLimit(any.freeQuestionLimit, TEST_YOURSELF_FREE_LIMIT),
      enrolledLimit: clampLimit(
        any.enrolledQuestionLimit,
        TEST_YOURSELF_ENROLLED_LIMIT,
      ),
      courseId: any.courseId ? String(any.courseId) : undefined,
      name: String(any.name || trimmed),
    };
  }

  return {
    freeLimit: TEST_YOURSELF_FREE_LIMIT,
    enrolledLimit: TEST_YOURSELF_ENROLLED_LIMIT,
    courseId: undefined as string | undefined,
    name: trimmed,
  };
}

export async function resolveTestFreeLimit(
  subject: string,
  topic: string,
  fallback: number,
) {
  const test = await getTestYourselfTestBySubjectTopic(subject, topic);
  if (test?.freeQuestionLimit) return clampLimit(test.freeQuestionLimit, fallback);
  const subjectLimits = await resolveSubjectQuestionLimits(subject);
  return subjectLimits.freeLimit || fallback;
}

export function mapTestYourselfQuestion(row: Record<string, unknown>) {
  const options = Array.isArray(row.options)
    ? (row.options as { text?: string }[]).map((opt, index) => ({
        index,
        text: String(opt.text ?? "").trim(),
      }))
    : [];

  return {
    _id: String(row._id),
    subject: String(row.subject ?? ""),
    topic: String(row.topic ?? ""),
    subtopic: row.subtopic ? String(row.subtopic) : undefined,
    difficulty: Number(row.difficulty) as 1 | 2 | 3,
    questionFormat:
      row.questionFormat === "written" || options.filter((o) => o.text).length === 0
        ? "written"
        : "mcq",
    questionText: String(row.questionText ?? ""),
    hasDiagram: Boolean(row.hasDiagram),
    diagramUrl: row.diagramUrl ? String(row.diagramUrl) : undefined,
    options: options.filter((o) => o.text),
    marks: row.marks != null ? Number(row.marks) : undefined,
    accessPolicy: row.accessPolicy ? String(row.accessPolicy) : undefined,
  };
}

export function buildStudentTestYourselfQuestionFilter(
  access: TestYourselfAccessInfo,
  subject: string,
  topic?: string,
): Record<string, unknown> {
  const normalizedTopic = (topic || "").trim();
  const useTopic =
    normalizedTopic && !isCourseLevelTestTopic(normalizedTopic)
      ? normalizedTopic
      : undefined;

  const publicFilter = useTopic
    ? buildTestYourselfQuestionFilter(subject, useTopic)
    : {
        ...TEST_YOURSELF_VISIBLE_FILTER,
        subject: {
          $regex: `^${subject.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
        topic: { $nin: [TEST_YOURSELF_COURSE_TOPIC, ""] },
      };

  if (!access.fullAccess || !access.privateGrants?.length) {
    return publicFilter;
  }

  const privateMatch = buildInheritedPrivateQuestionMatch(access.privateGrants, {
    subject,
    topic: useTopic,
  });
  if (!privateMatch) return publicFilter;

  return { $or: [publicFilter, privateMatch] };
}

/** Subject-first catalog — one card per subject, topics nested for topic-wise mode. */
export async function listTestYourselfSubjects(
  access: TestYourselfAccessInfo,
  options?: { grade?: string | null },
): Promise<TestYourselfSubjectCard[]> {
  const gradeMatch = resolveGradeQueryValue(options?.grade ?? null);

  const testFilter: Record<string, unknown> = { isActive: { $ne: false } };
  if (gradeMatch) testFilter.grade = gradeMatch;

  const testRows = await TestYourselfTest.find(testFilter)
    .select(
      "subject topic name grade freeQuestionLimit enrolledQuestionLimit courseId isPublished",
    )
    .lean();

  const courseMeta = new Map<
    string,
    {
      name?: string;
      grade?: string;
      freeLimit: number;
      enrolledLimit: number;
      courseId?: string;
      published: boolean;
    }
  >();

  for (const t of testRows) {
    const subject = String(t.subject).trim();
    const topic = String(t.topic).trim();
    const grade = String(t.grade || "").trim().toUpperCase() || undefined;
    const key = `${subject.toLowerCase()}::${grade || ""}`;
    const freeLimit = clampLimit(t.freeQuestionLimit, TEST_YOURSELF_FREE_LIMIT);
    const enrolledLimit = clampLimit(
      t.enrolledQuestionLimit,
      TEST_YOURSELF_ENROLLED_LIMIT,
    );
    if (isCourseLevelTestTopic(topic)) {
      courseMeta.set(key, {
        name: String(t.name || subject),
        grade,
        freeLimit,
        enrolledLimit,
        courseId: t.courseId ? String(t.courseId) : undefined,
        published: t.isPublished !== false,
      });
      continue;
    }
    // Topic-level tests can supply limits when no course-level config exists yet.
    if (!courseMeta.has(key) && t.isPublished !== false) {
      courseMeta.set(key, {
        name: subject,
        grade,
        freeLimit,
        enrolledLimit,
        courseId: t.courseId ? String(t.courseId) : undefined,
        published: true,
      });
    }
  }

  let match: Record<string, unknown> = { ...TEST_YOURSELF_VISIBLE_FILTER };
  if (access.fullAccess && access.privateGrants?.length) {
    const privateMatch = buildInheritedPrivateQuestionMatch(access.privateGrants);
    if (privateMatch) {
      match = { $or: [{ ...TEST_YOURSELF_VISIBLE_FILTER }, privateMatch] };
    }
  }
  if (gradeMatch) {
    match = { $and: [match, { grade: gradeMatch }] };
  }

  const rows = await PlatformQuestion.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          subject: "$subject",
          topic: "$topic",
          grade: "$grade",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.subject": 1, "_id.topic": 1 } },
  ]);

  const bySubject = new Map<
    string,
    {
      subject: string;
      grade?: string;
      topics: { topic: string; name: string; questionCount: number }[];
      questionCount: number;
    }
  >();

  for (const row of rows) {
    const subject = String(row._id?.subject ?? "").trim();
    const topic = String(row._id?.topic ?? "").trim();
    const grade = String(row._id?.grade ?? "").trim().toUpperCase() || undefined;
    if (!subject || !topic || isCourseLevelTestTopic(topic)) continue;

    const unpublished = testRows.find(
      (t) =>
        String(t.subject).trim().toLowerCase() === subject.toLowerCase() &&
        String(t.topic).trim() === topic &&
        String(t.grade || "")
          .trim()
          .toUpperCase() === (grade || "") &&
        t.isPublished === false,
    );
    if (unpublished) continue;

    const questionCount = Number(row.count) || 0;
    // Public: topic-wise needs enough published TY questions.
    if (!access.fullAccess && questionCount < TEST_YOURSELF_PUBLIC_TOPIC_MIN) {
      continue;
    }

    const key = `${subject.toLowerCase()}::${grade || ""}`;
    let entry = bySubject.get(key);
    if (!entry) {
      entry = { subject, grade, topics: [], questionCount: 0 };
      bySubject.set(key, entry);
    }
    entry.topics.push({
      topic,
      name: formatTestYourselfName(topic, subject),
      questionCount,
    });
    entry.questionCount += questionCount;
  }

  const subjects: TestYourselfSubjectCard[] = [];
  for (const entry of bySubject.values()) {
    if (entry.questionCount <= 0 || entry.topics.length === 0) continue;
    const metaKey = `${entry.subject.toLowerCase()}::${entry.grade || ""}`;
    const meta =
      courseMeta.get(metaKey) ||
      courseMeta.get(`${entry.subject.toLowerCase()}::`);
    if (meta && meta.published === false) continue;

    const freeLimit = meta?.freeLimit ?? TEST_YOURSELF_FREE_LIMIT;
    const enrolledLimit = meta?.enrolledLimit ?? TEST_YOURSELF_ENROLLED_LIMIT;

    // Public full-subject also needs a usable pool.
    if (!access.fullAccess && entry.questionCount < TEST_YOURSELF_PUBLIC_TOPIC_MIN) {
      continue;
    }

    subjects.push({
      subject: entry.subject,
      name: meta?.name || entry.subject,
      grade: entry.grade || meta?.grade,
      questionCount: entry.questionCount,
      topicCount: entry.topics.length,
      freeLimit,
      enrolledLimit,
      courseId: meta?.courseId,
      topics: entry.topics,
    });
  }

  return subjects.sort((a, b) => a.subject.localeCompare(b.subject));
}

/** @deprecated topic-flat list — prefer listTestYourselfSubjects */
export async function listTestYourselfTopics(access: TestYourselfAccessInfo) {
  const subjects = await listTestYourselfSubjects(access);
  return subjects.flatMap((s) =>
    s.topics.map((t) => ({
      subject: s.subject,
      topic: t.topic,
      name: t.name,
      questionCount: t.questionCount,
      previewCount: access.fullAccess
        ? t.questionCount
        : Math.min(t.questionCount, s.freeLimit),
      lockedCount: access.fullAccess
        ? 0
        : Math.max(0, t.questionCount - s.freeLimit),
      freeLimit: s.freeLimit,
      enrolledLimit: s.enrolledLimit,
      courseId: s.courseId,
    })),
  );
}

export async function listTestYourselfQuestions(
  access: TestYourselfAccessInfo,
  subject: string,
  options: ListQuestionsOptions,
) {
  const mode = options.mode === "topic" ? "topic" : "full";
  const topic =
    mode === "topic" ? String(options.topic || "").trim() : undefined;

  if (mode === "topic" && !topic) {
    return {
      error: "topic is required for topic-wise mode",
      poolSize: 0,
      sampleSize: 0,
      freeLimit: access.freeLimit,
      enrolledLimit: access.enrolledLimit,
      questions: [] as ReturnType<typeof mapTestYourselfQuestion>[],
    };
  }

  if (mode === "topic" && !access.fullAccess) {
    const count = await PlatformQuestion.countDocuments(
      buildTestYourselfQuestionFilter(subject, topic!),
    );
    if (count < TEST_YOURSELF_PUBLIC_TOPIC_MIN) {
      return {
        error: `This topic needs at least ${TEST_YOURSELF_PUBLIC_TOPIC_MIN} published questions for free practice`,
        poolSize: count,
        sampleSize: 0,
        freeLimit: access.freeLimit,
        enrolledLimit: access.enrolledLimit,
        questions: [],
      };
    }
  }

  const limits = await resolveSubjectQuestionLimits(subject);
  const freeLimit = limits.freeLimit;
  const enrolledLimit = limits.enrolledLimit;

  const filter = buildStudentTestYourselfQuestionFilter(access, subject, topic);
  if (
    options.difficulty &&
    options.difficulty !== "all" &&
    [1, 2, 3].includes(Number(options.difficulty))
  ) {
    (filter as Record<string, unknown>).difficulty = Number(options.difficulty);
  }

  const poolSize = await PlatformQuestion.countDocuments(filter);
  const sampleSize = Math.min(
    access.fullAccess ? enrolledLimit : freeLimit,
    poolSize,
  );

  if (sampleSize <= 0) {
    return {
      error: null as string | null,
      poolSize,
      sampleSize: 0,
      freeLimit,
      enrolledLimit,
      questions: [],
    };
  }

  // Random sample in Mongo — avoid loading the full pool into memory.
  const sampled = await PlatformQuestion.aggregate([
    { $match: filter },
    { $sample: { size: sampleSize } },
  ]);

  return {
    error: null as string | null,
    poolSize,
    sampleSize: sampled.length,
    freeLimit,
    enrolledLimit,
    questions: sampled.map((r) =>
      mapTestYourselfQuestion(r as Record<string, unknown>),
    ),
  };
}

export async function checkTestYourselfAnswers(
  access: TestYourselfAccessInfo,
  subject: string,
  options: {
    mode: TestYourselfAttemptMode;
    topic?: string;
    difficulty?: number;
    answers: { questionId: string; optionIndex?: number; textAnswer?: string }[];
  },
) {
  const ids = options.answers
    .map((a) => a.questionId)
    .filter((id) => isObjectId(id));

  if (!ids.length) {
    return { error: "No valid answers submitted", results: null as null };
  }

  const limits = await resolveSubjectQuestionLimits(subject);
  const maxAnswers = access.fullAccess ? limits.enrolledLimit : limits.freeLimit;

  if (options.answers.length > maxAnswers) {
    return {
      error: `You can submit at most ${maxAnswers} questions per attempt`,
      results: null,
    };
  }

  const topic =
    options.mode === "topic" ? String(options.topic || "").trim() : undefined;
  const baseFilter = buildStudentTestYourselfQuestionFilter(
    access,
    subject,
    topic,
  );

  const rows = await PlatformQuestion.find({
    $and: [
      { _id: { $in: ids.map((id) => toObjectId(id)) } },
      baseFilter,
    ],
  }).lean();

  if (rows.length !== ids.length) {
    return {
      error: "One or more questions are not available for this attempt",
      results: null,
    };
  }

  const byId = new Map(rows.map((r) => [String(r._id), r]));

  const results = options.answers.map((ans) => {
    const row = byId.get(ans.questionId);
    if (!row) {
      return {
        questionId: ans.questionId,
        correct: false,
        selectedIndex: ans.optionIndex,
        correctIndex: -1,
      };
    }

    const opts = Array.isArray(row.options)
      ? (row.options as { isCorrect?: boolean }[])
      : [];
    const questionFormat =
      row.questionFormat === "written" || opts.length === 0 ? "written" : "mcq";

    if (questionFormat === "written") {
      return {
        questionId: ans.questionId,
        correct: false,
        correctIndex: -1,
        selectedText: ans.textAnswer,
        questionFormat,
        selfCheck: true,
        answerText: row.answerText ? String(row.answerText) : undefined,
        msText: row.msText ? String(row.msText) : undefined,
        explanation:
          row.explanation || row.msText
            ? String(row.explanation || row.msText)
            : undefined,
      };
    }

    const correctIndex = opts.findIndex((o) => Boolean(o.isCorrect));
    const correct =
      correctIndex >= 0 &&
      ans.optionIndex != null &&
      ans.optionIndex === correctIndex &&
      ans.optionIndex >= 0 &&
      ans.optionIndex < opts.length;

    return {
      questionId: ans.questionId,
      correct,
      selectedIndex: ans.optionIndex,
      correctIndex,
      questionFormat,
      explanation: row.explanation ? String(row.explanation) : undefined,
    };
  });

  const score = results.filter((r) => !r.selfCheck && r.correct).length;
  const total = results.length;

  let attemptId: string | undefined;
  if (access.userId && isObjectId(access.userId)) {
    const attempt = await TestYourselfAttempt.create({
      userId: toObjectId(access.userId),
      subject,
      topic: topic || undefined,
      mode: options.mode,
      difficulty: options.difficulty,
      score,
      total,
      questionIds: ids.map((id) => toObjectId(id)),
      fullAccess: access.fullAccess,
    });
    attemptId = String(attempt._id);
  }

  return {
    error: null,
    results,
    score,
    total,
    attemptId,
  };
}

export function mapTestYourselfAttempt(
  row: Record<string, unknown>,
): TestYourselfAttemptRow {
  return {
    _id: String(row._id),
    subject: String(row.subject ?? ""),
    topic: row.topic ? String(row.topic) : undefined,
    mode: row.mode === "topic" ? "topic" : "full",
    difficulty:
      row.difficulty != null && Number.isFinite(Number(row.difficulty))
        ? Number(row.difficulty)
        : undefined,
    score: Number(row.score) || 0,
    total: Number(row.total) || 0,
    fullAccess: Boolean(row.fullAccess),
    createdAt: row.createdAt
      ? new Date(String(row.createdAt)).toISOString()
      : new Date().toISOString(),
  };
}

export async function listTestYourselfAttemptsForUser(
  userId: string,
  limit = 50,
) {
  if (!isObjectId(userId)) return [];
  const rows = await TestYourselfAttempt.find({ userId: toObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .lean();
  return rows.map((r) =>
    mapTestYourselfAttempt(r as unknown as Record<string, unknown>),
  );
}
