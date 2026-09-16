import Batch from "@/models/Batch";
import Course from "@/models/Course";
import PlatformQuestion from "@/models/PlatformQuestion";
import Subject from "@/models/Subject";
import TestYourselfTest, { type ITestYourselfTest } from "@/models/TestYourselfTest";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";
import { TEST_YOURSELF_VISIBLE_FILTER } from "@/lib/resources/testYourself";
import {
  formatTestYourselfName,
  isCourseLevelTestTopic,
  TEST_YOURSELF_COURSE_TOPIC,
} from "@/lib/resources/testYourselfTestName";
import {
  normalizeSubjectChapters,
  topicNameFromList,
  topicsFromSubjectChapters,
} from "@/lib/subjectChapters";
import { topicName as pastPaperTopicName } from "@/lib/pastPaperTopics";
import { resolveDisplayQid } from "@/lib/pastPaperCode";
import { resolveGradeQueryValue } from "@/lib/batchGrades";
import type { TestYourselfTestRow } from "@/types/testYourselfTest";

export function mapTestYourselfTest(
  row: ITestYourselfTest | Record<string, unknown>,
  questionCount = 0,
): TestYourselfTestRow {
  const r = row as Record<string, unknown>;
  return {
    _id: String(r._id),
    subject: String(r.subject ?? ""),
    topic: String(r.topic ?? ""),
    name: String(r.name ?? ""),
    grade: r.grade ? String(r.grade) : undefined,
    freeQuestionLimit: Number(r.freeQuestionLimit ?? 5),
    enrolledQuestionLimit: Number(r.enrolledQuestionLimit ?? 12),
    isPublished: r.isPublished !== false,
    isActive: r.isActive !== false,
    questionCount,
    courseId: r.courseId ? String(r.courseId) : undefined,
    createdAt: r.createdAt ? String(r.createdAt) : undefined,
    updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match public Test Yourself questions; course-level tests include every topic under the subject. */
export function buildTestYourselfQuestionFilter(subject: string, topic: string) {
  const trimmedSubject = subject.trim();
  const normalizedTopic = topic.trim() || TEST_YOURSELF_COURSE_TOPIC;
  const filter: Record<string, unknown> = {
    ...TEST_YOURSELF_VISIBLE_FILTER,
    subject: {
      $regex: `^${escapeRegex(trimmedSubject)}$`,
      $options: "i",
    },
  };
  if (!isCourseLevelTestTopic(normalizedTopic)) {
    filter.topic = normalizedTopic;
  }
  return filter;
}

export async function countPublishedQuestions(subject: string, topic: string) {
  return PlatformQuestion.countDocuments(buildTestYourselfQuestionFilter(subject, topic));
}

/**
 * Restore Platform QB topics that were overwritten to "Course" when publishing
 * to Test Yourself. Prefer topicNumber → chapter name, else promote subtopic.
 * Also collapse case-variant subject strings onto the canonical Subject name.
 */
export async function repairCourseTopicOverwrites() {
  const subjects = await Subject.find({ isActive: { $ne: false } })
    .select("_id name chapters")
    .lean();

  // Case-normalize question subject strings onto the registry name.
  const distinctSubjects = await PlatformQuestion.distinct("subject");
  for (const raw of distinctSubjects) {
    const current = String(raw || "").trim();
    if (!current) continue;
    const canonical = subjects.find(
      (s) => String(s.name).trim().toLowerCase() === current.toLowerCase(),
    );
    if (canonical && String(canonical.name).trim() !== current) {
      await PlatformQuestion.updateMany(
        { subject: current },
        { $set: { subject: String(canonical.name).trim() } },
      );
    }
  }

  const corrupted = await PlatformQuestion.find({
    topic: TEST_YOURSELF_COURSE_TOPIC,
  })
    .select("_id subject subjectId topicNumber subtopic")
    .lean();

  if (!corrupted.length) return 0;

  const byId = new Map(subjects.map((s) => [String(s._id), s]));
  const byName = new Map(
    subjects.map((s) => [String(s.name).trim().toLowerCase(), s]),
  );

  let repaired = 0;
  for (const q of corrupted) {
    const subjectDoc =
      (q.subjectId ? byId.get(String(q.subjectId)) : undefined) ||
      byName.get(String(q.subject || "").trim().toLowerCase());
    const chapters = subjectDoc
      ? topicsFromSubjectChapters(
          normalizeSubjectChapters((subjectDoc as { chapters?: unknown }).chapters),
        )
      : [];
    const fromNumber =
      topicNameFromList(q.topicNumber as number | undefined, chapters) ||
      pastPaperTopicName(q.topicNumber as number | undefined);
    const fromSubtopic = String(q.subtopic || "").trim();
    const restored = (fromNumber || fromSubtopic).trim();
    if (!restored || restored === TEST_YOURSELF_COURSE_TOPIC) continue;

    const update: Record<string, unknown> = { $set: { topic: restored } };
    if (!fromNumber && fromSubtopic) {
      update.$unset = { subtopic: 1 };
    }

    await PlatformQuestion.updateOne({ _id: q._id }, update);
    repaired += 1;
  }

  // Backfill compact Cambridge QIDs (0606_m19_12_Q1ai) when missing or legacy-formatted.
  const needingQid = await PlatformQuestion.find({
    sourceType: "pastpaper",
    questionNumber: { $exists: true, $nin: [null, ""] },
    $or: [
      { qid: { $exists: false } },
      { qid: null },
      { qid: "" },
      { qid: { $not: /^\d{4}_[msw]\d{2}_\d{2}_Q/i } },
    ],
  })
    .select(
      "_id qid subjectCode session year paper questionNumber",
    )
    .lean();

  for (const q of needingQid) {
    const next = resolveDisplayQid({
      qid: q.qid as string | undefined,
      subjectCode: q.subjectCode as string | undefined,
      session: q.session as string | undefined,
      year: q.year as number | undefined,
      paper: q.paper as string | undefined,
      questionNumber: q.questionNumber as string | undefined,
    });
    if (!next || next === q.qid) continue;
    try {
      await PlatformQuestion.updateOne({ _id: q._id }, { $set: { qid: next } });
    } catch {
      // Unique index may collide; leave existing value.
    }
  }

  return repaired;
}

export async function ensureTestYourselfTest(
  subject: string,
  topic: string,
  options?: {
    userId?: string;
    grade?: string;
    freeQuestionLimit?: number;
    enrolledQuestionLimit?: number;
    isPublished?: boolean;
  },
) {
  const trimmedSubject = subject.trim();
  const trimmedTopic = topic.trim() || TEST_YOURSELF_COURSE_TOPIC;
  const grade =
    options?.grade && options.grade !== "all"
      ? options.grade.trim().toUpperCase()
      : "";
  const name = formatTestYourselfName(trimmedTopic, trimmedSubject);

  let test = await TestYourselfTest.findOne({
    subject: trimmedSubject,
    topic: trimmedTopic,
    grade,
  });

  if (!test) {
    test = await TestYourselfTest.create({
      subject: trimmedSubject,
      topic: trimmedTopic,
      grade,
      name,
      freeQuestionLimit: options?.freeQuestionLimit ?? 5,
      enrolledQuestionLimit: options?.enrolledQuestionLimit ?? 12,
      isPublished: options?.isPublished ?? true,
      isActive: true,
      createdBy: options?.userId && isObjectId(options.userId) ? toObjectId(options.userId) : undefined,
    });
    return test;
  }

  if (test.name !== name) {
    test.name = name;
  }
  if (options?.userId && isObjectId(options.userId)) {
    test.updatedBy = toObjectId(options.userId);
  }
  await test.save();
  return test;
}

export async function syncTestsFromPublishedQuestions() {
  await repairCourseTopicOverwrites();

  const groups = await PlatformQuestion.aggregate([
    { $match: TEST_YOURSELF_VISIBLE_FILTER },
    {
      $group: {
        _id: { subject: "$subject", topic: "$topic" },
      },
    },
  ]);

  for (const group of groups) {
    const subject = String(group._id?.subject ?? "").trim();
    const topic = String(group._id?.topic ?? "").trim();
    if (!subject || !topic) continue;
    // Skip legacy "Course" buckets — questions keep their real topics.
    if (isCourseLevelTestTopic(topic)) continue;
    await ensureTestYourselfTest(subject, topic);
  }
}

export async function listStaffTestYourselfTests(filters?: {
  search?: string;
  subject?: string;
  grade?: string;
}) {
  await syncTestsFromPublishedQuestions();

  const query: Record<string, unknown> = { isActive: { $ne: false } };
  if (filters?.subject) {
    query.subject = { $regex: filters.subject.trim(), $options: "i" };
  }
  if (filters?.grade && filters.grade !== "all") {
    const gradeMatch = resolveGradeQueryValue(filters.grade);
    if (gradeMatch) query.grade = gradeMatch;
  }
  if (filters?.search) {
    const s = filters.search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { subject: { $regex: s, $options: "i" } },
      { topic: { $regex: s, $options: "i" } },
    ];
  }

  const rows = await TestYourselfTest.find(query)
    .sort({ subject: 1, topic: 1 })
    .lean();

  const tests: TestYourselfTestRow[] = [];
  for (const row of rows) {
    const count = await countPublishedQuestions(
      String(row.subject),
      String(row.topic),
    );
    tests.push(mapTestYourselfTest(row, count));
  }

  return tests;
}

export async function getTestYourselfTestById(id: string) {
  if (!isObjectId(id)) return null;
  const row = await TestYourselfTest.findById(id).lean();
  if (!row) return null;
  const count = await countPublishedQuestions(String(row.subject), String(row.topic));
  return mapTestYourselfTest(row, count);
}

export async function getTestYourselfTestBySubjectTopic(subject: string, topic: string) {
  const row = await TestYourselfTest.findOne({
    subject: subject.trim(),
    topic: topic.trim(),
    isActive: { $ne: false },
  }).lean();
  if (!row) return null;
  const count = await countPublishedQuestions(subject, topic);
  return mapTestYourselfTest(row, count);
}

export async function resolveTestYourselfEnrollUrl(subject: string, courseId?: string) {
  if (courseId && isObjectId(courseId)) {
    return `/enroll/course/${courseId}`;
  }

  const trimmed = subject.trim();
  if (!trimmed) return "/enroll";

  const course = await Course.findOne({
    isPublished: { $ne: false },
    $or: [
      { subjectName: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } },
      { category: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } },
      { title: { $regex: escapeRegex(trimmed), $options: "i" } },
    ],
  })
    .select("_id")
    .lean();

  if (course?._id) {
    return `/enroll/course/${String(course._id)}`;
  }

  const batch = await Batch.findOne({
    isActive: { $ne: false },
    subject: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" },
  })
    .select("courseId _id")
    .lean();

  if (batch?.courseId) {
    return `/enroll/course/${String(batch.courseId)}`;
  }
  if (batch?._id) {
    return `/enroll/${String(batch._id)}`;
  }

  return "/enroll";
}

/**
 * Publish questions to Test Yourself without rewriting Platform QB subject/topic.
 * Membership is accessPolicy=public; tests are ensured from each question's real topic.
 */
export async function publishQuestionsToTest(
  questionIds: string[],
  subject: string,
  topic: string,
  userId?: string,
) {
  const validIds = questionIds.filter((id) => isObjectId(id)).map((id) => toObjectId(id));
  if (!validIds.length) {
    return { error: "No valid question IDs", updated: 0 };
  }

  await repairCourseTopicOverwrites();

  const result = await PlatformQuestion.updateMany(
    { _id: { $in: validIds } },
    {
      $set: {
        accessPolicy: "public",
        isActive: true,
      },
    },
  );

  const groups = await PlatformQuestion.aggregate([
    { $match: { _id: { $in: validIds } } },
    { $group: { _id: { subject: "$subject", topic: "$topic" } } },
  ]);

  for (const group of groups) {
    const qSubject = String(group._id?.subject ?? "").trim() || subject.trim();
    const qTopic = String(group._id?.topic ?? "").trim();
    if (!qSubject || !qTopic || isCourseLevelTestTopic(qTopic)) continue;
    await ensureTestYourselfTest(qSubject, qTopic, {
      userId,
      isPublished: true,
    });
  }

  // Optional course-level container when the UI still passes subject + "Course".
  const trimmedSubject = subject.trim();
  const trimmedTopic = topic.trim();
  if (trimmedSubject && isCourseLevelTestTopic(trimmedTopic || TEST_YOURSELF_COURSE_TOPIC)) {
    await ensureTestYourselfTest(trimmedSubject, TEST_YOURSELF_COURSE_TOPIC, {
      userId,
      isPublished: true,
    });
  }

  return { error: null, updated: result.modifiedCount };
}

export async function unpublishTestQuestions(subject: string, topic: string) {
  const result = await PlatformQuestion.updateMany(
    buildTestYourselfQuestionFilter(subject, topic),
    { $set: { accessPolicy: "private" } },
  );
  return result.modifiedCount;
}

export async function listTestQuestions(subject: string, topic: string) {
  const rows = await PlatformQuestion.find(buildTestYourselfQuestionFilter(subject, topic))
    .sort({ difficulty: 1, createdAt: 1 })
    .lean();

  return rows;
}

export async function removeQuestionsFromTest(questionIds: string[]) {
  const validIds = questionIds.filter((id) => isObjectId(id)).map((id) => toObjectId(id));
  if (!validIds.length) return 0;

  const result = await PlatformQuestion.updateMany(
    { _id: { $in: validIds } },
    { $set: { accessPolicy: "private" } },
  );
  return result.modifiedCount;
}
