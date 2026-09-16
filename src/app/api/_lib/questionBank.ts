import mongoose from "mongoose";
import Question from "@/models/Question";
import Exam from "@/models/Exam";
import Lesson from "@/models/Lesson";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import { resolveAccessibleCourseIds } from "@/lib/chapters/management";
import type { AppRole, SessionUser } from "@/app/api/_lib/phase12";
import { isObjectId, pagination, parseLimit, parsePage, toObjectId } from "@/app/api/_lib/phase12";

export function buildQuestionStats(rows: Array<Record<string, unknown>>) {
  const byType: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalMarks = 0;
  for (const q of rows) {
    const type = String(q.type || "unknown");
    const difficulty = String(q.difficulty || "unknown");
    byType[type] = (byType[type] || 0) + 1;
    byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;
    const key = q.isActive !== false ? "active" : "inactive";
    byStatus[key] = (byStatus[key] || 0) + 1;
    totalMarks += Number(q.marks || 0);
  }
  return {
    totalQuestions: rows.length,
    activeQuestions: rows.filter((q) => q.isActive !== false).length,
    mcqQuestions: rows.filter((q) => q.type === "mcq").length,
    totalMarks,
    byType,
    byDifficulty,
    byStatus,
  };
}

async function getExamIdsForCourses(courseIds: mongoose.Types.ObjectId[]) {
  if (!courseIds.length) return [];
  return Exam.find({ course: { $in: courseIds } }).distinct("_id");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function topicNameEquals(value: unknown, want: string) {
  return String(value || "").trim().toLowerCase() === want;
}

function rowMatchesTopic(q: Record<string, unknown>, topicName: string) {
  const want = topicName.trim().toLowerCase();
  if (!want) return true;
  if (topicNameEquals(q.topic, want)) return true;
  const chapter = q.chapter as { title?: string } | undefined;
  if (topicNameEquals(chapter?.title, want)) return true;
  const tags = Array.isArray(q.tags) ? q.tags : [];
  return tags.some((tag) => topicNameEquals(tag, want));
}

async function collectInstructorTopicNames(args: {
  userId: string;
  subjectName: string;
  courseIds: mongoose.Types.ObjectId[];
  platformFilter: Record<string, unknown> | null;
}): Promise<string[]> {
  const topicSet = new Set<string>();
  const PlatformQuestion = (await import("@/models/PlatformQuestion")).default;

  const jobs: Promise<unknown>[] = [];

  if (args.courseIds.length) {
    jobs.push(
      Chapter.find({ course: { $in: args.courseIds } })
        .distinct("title")
        .then((titles) => {
          for (const title of titles) {
            const name = String(title || "").trim();
            if (name) topicSet.add(name);
          }
        }),
    );
  }

  if (args.platformFilter) {
    const pf: Record<string, unknown> = { ...args.platformFilter };
    if (args.subjectName) {
      const existingAnd = Array.isArray(pf.$and)
        ? (pf.$and as Record<string, unknown>[])
        : [];
      pf.$and = [
        ...existingAnd,
        {
          subject: {
            $regex: `^${escapeRegex(args.subjectName)}$`,
            $options: "i",
          },
        },
      ];
    }
    jobs.push(
      PlatformQuestion.distinct("topic", pf).then((topics) => {
        for (const topic of topics) {
          const name = String(topic || "").trim();
          if (name) topicSet.add(name);
        }
      }),
    );
  }

  const ownFilter: Record<string, unknown> = {
    createdBy: toObjectId(args.userId),
    topic: { $exists: true, $nin: [null, ""] },
  };
  if (args.subjectName) {
    ownFilter.$or = [
      { category: { $regex: `^${escapeRegex(args.subjectName)}$`, $options: "i" } },
      { subject: { $regex: `^${escapeRegex(args.subjectName)}$`, $options: "i" } },
      { tags: args.subjectName },
    ];
  }
  jobs.push(
    Question.distinct("topic", ownFilter).then((topics) => {
      for (const topic of topics) {
        const name = String(topic || "").trim();
        if (name) topicSet.add(name);
      }
    }),
  );

  await Promise.all(jobs);
  return Array.from(topicSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Shared Platform QB questions carry `subject`/`topic` strings (not course/chapter
 * refs). The instructor bank's "subjects" are courses and "topics" are chapters whose
 * titles mirror the platform taxonomy. Translate the selected course/chapter into a
 * subject/topic constraint so shared questions respect the sidebar filter.
 *
 * Returns `null` when the selection maps to no platform subject/topic — callers should
 * then hide shared rows entirely (a specific selection must stay scoped).
 */
async function buildPlatformScopeClause(
  courseParam: string,
  chapterParam: string,
): Promise<Record<string, unknown> | null> {
  const and: Record<string, unknown>[] = [];
  let courseId: string | null =
    courseParam && isObjectId(courseParam) ? courseParam : null;

  if (chapterParam && isObjectId(chapterParam)) {
    const chapter = await Chapter.findById(chapterParam).select("title course").lean();
    const title = chapter?.title ? String(chapter.title).trim() : "";
    if (title) {
      and.push({ topic: { $regex: `^${escapeRegex(title)}$`, $options: "i" } });
    }
    if (!courseId && chapter?.course) courseId = String(chapter.course);
  }

  if (courseId && isObjectId(courseId)) {
    const course = await Course.findById(courseId)
      .select("subjectId subjectCode subjectName")
      .lean();
    const subjectOr: Record<string, unknown>[] = [];
    if (course?.subjectId) subjectOr.push({ subjectId: course.subjectId });
    if (course?.subjectCode) {
      subjectOr.push({ subjectCode: String(course.subjectCode).toUpperCase() });
    }
    if (course?.subjectName) {
      subjectOr.push({
        subject: { $regex: `^${escapeRegex(String(course.subjectName).trim())}$`, $options: "i" },
      });
    }
    if (subjectOr.length) and.push({ $or: subjectOr });
  }

  if (!and.length) return null;
  return and.length === 1 ? and[0] : { $and: and };
}

async function getLessonIdsForChapters(chapterIds: mongoose.Types.ObjectId[]) {
  if (!chapterIds.length) return [];
  return Lesson.find({ chapter: { $in: chapterIds } }).distinct("_id");
}

async function resolveChapterIds(
  courseId: string | null,
  chapterId: string | null,
  allowedCourseIds: mongoose.Types.ObjectId[] | null,
) {
  const chapterFilter: Record<string, unknown> = {};
  if (chapterId && isObjectId(chapterId)) {
    chapterFilter._id = toObjectId(chapterId);
  }
  if (courseId && isObjectId(courseId)) {
    chapterFilter.course = toObjectId(courseId);
  } else if (allowedCourseIds) {
    chapterFilter.course = { $in: allowedCourseIds };
  }
  if (!Object.keys(chapterFilter).length) return [];
  return Chapter.find(chapterFilter).distinct("_id");
}

/** Build Mongo filter for question-bank list/stats (course → chapter → exam hierarchy). */
export async function buildQuestionBankFilter(
  user: SessionUser,
  searchParams: URLSearchParams,
): Promise<Record<string, unknown>> {
  const search = (searchParams.get("search") || "").trim();
  const type = (searchParams.get("type") || "").trim();
  const difficulty = (searchParams.get("difficulty") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const examParam = (searchParams.get("exam") || "").trim();
  const courseParam = (searchParams.get("course") || "").trim();
  const subjectParam = (searchParams.get("subject") || "").trim();
  const chapterParam = (searchParams.get("chapter") || "").trim();
  const lessonParam = (searchParams.get("lesson") || "").trim();

  const filter: Record<string, unknown> = {};

  if (search) filter.question = { $regex: escapeRegex(search), $options: "i" };
  if (type && type !== "all") filter.type = type;
  if (difficulty && difficulty !== "all") filter.difficulty = difficulty;
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;
  if (examParam && isObjectId(examParam)) {
    filter.exam = toObjectId(examParam);
  }
  const idsParam = (searchParams.get("ids") || "").trim();
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => isObjectId(id))
      .map((id) => toObjectId(id));
    filter._id = { $in: ids };
    // Hydrate / bulk-by-id: skip hierarchy so selected questions still resolve on edit.
    return filter;
  }

  const role = user.role as AppRole;
  let allowedCourseIds: mongoose.Types.ObjectId[] | null = null;
  if (role === "instructor") {
    allowedCourseIds = await resolveAccessibleCourseIds(user.id, "instructor");
    // Empty course list is OK — borrow copies may still exist.
  }

  let scopeCourseIds = allowedCourseIds;
  const coursesParam = (searchParams.get("courses") || "").trim();
  const multiCourseIds = coursesParam
    ? coursesParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => isObjectId(id))
        .map((id) => toObjectId(id))
    : [];

  if (multiCourseIds.length) {
    if (allowedCourseIds) {
      scopeCourseIds = multiCourseIds.filter((id) =>
        allowedCourseIds!.some((allowedId) => allowedId.equals(id)),
      );
    } else {
      scopeCourseIds = multiCourseIds;
    }
  } else if (courseParam && isObjectId(courseParam)) {
    const cid = toObjectId(courseParam);
    if (allowedCourseIds && !allowedCourseIds.some((id) => id.equals(cid))) {
      return { _id: { $in: [] } };
    }
    scopeCourseIds = [cid];
  } else if (subjectParam && isObjectId(subjectParam)) {
    const subjectCourseIds = (await Course.find({
      subjectId: toObjectId(subjectParam),
    }).distinct("_id")) as mongoose.Types.ObjectId[];
    scopeCourseIds = allowedCourseIds
      ? subjectCourseIds.filter((id) =>
          allowedCourseIds!.some((allowedId) => allowedId.equals(id)),
        )
      : subjectCourseIds;
  }

  const hierarchyParts: Record<string, unknown>[] = [];

  if (lessonParam && isObjectId(lessonParam)) {
    hierarchyParts.push({ lesson: toObjectId(lessonParam) });
  } else if (chapterParam && isObjectId(chapterParam)) {
    const chapterIds = await resolveChapterIds(
      courseParam && isObjectId(courseParam) ? courseParam : null,
      chapterParam,
      allowedCourseIds,
    );
    const lessonIds = await getLessonIdsForChapters(chapterIds);
    if (lessonIds.length) hierarchyParts.push({ lesson: { $in: lessonIds } });
    if (!lessonIds.length && !examParam) {
      hierarchyParts.push({ _id: { $in: [] } });
    }
  } else if (
    scopeCourseIds?.length ||
    (courseParam && isObjectId(courseParam)) ||
    multiCourseIds.length > 0 ||
    (subjectParam && isObjectId(subjectParam))
  ) {
    const courseIds =
      scopeCourseIds ||
      (courseParam && isObjectId(courseParam) ? [toObjectId(courseParam)] : []);
    const examIds = await getExamIdsForCourses(courseIds);
    const chapterIds = await Chapter.find({ course: { $in: courseIds } }).distinct("_id");
    const lessonIds = await getLessonIdsForChapters(chapterIds);
    if (examIds.length) hierarchyParts.push({ exam: { $in: examIds } });
    if (lessonIds.length) hierarchyParts.push({ lesson: { $in: lessonIds } });
    if (!examIds.length && !lessonIds.length && !examParam) {
      hierarchyParts.push({ _id: { $in: [] } });
    }
  } else if (role === "instructor" && allowedCourseIds?.length) {
    const examIds = await getExamIdsForCourses(allowedCourseIds);
    const chapterIds = await Chapter.find({ course: { $in: allowedCourseIds } }).distinct("_id");
    const lessonIds = await getLessonIdsForChapters(chapterIds);
    if (examIds.length) hierarchyParts.push({ exam: { $in: examIds } });
    if (lessonIds.length) hierarchyParts.push({ lesson: { $in: lessonIds } });
    // If no course-linked questions exist yet, borrow copies can still populate the bank.
  }

  // Instructors: course-linked questions OR anything they own (including forks of Platform QB).
  if (role === "instructor") {
    const owned = { createdBy: toObjectId(user.id) };
    // A specific hierarchy selection (subject/topic/lesson/exam) must strictly scope
    // results to that hierarchy — don't leak every owned question via a blanket OR.
    const hasSpecificFilter =
      (lessonParam && isObjectId(lessonParam)) ||
      (chapterParam && isObjectId(chapterParam)) ||
      (courseParam && isObjectId(courseParam)) ||
      multiCourseIds.length > 0 ||
      (subjectParam && isObjectId(subjectParam)) ||
      (examParam && isObjectId(examParam));

    if (hasSpecificFilter) {
      if (hierarchyParts.length >= 1) {
        delete filter.exam;
        delete filter.lesson;
        delete filter._id;
        filter.$or = hierarchyParts;
      }
      // examParam-only selections keep filter.exam set above.
      return filter;
    }

    // Default view (no specific selection): course-linked questions OR anything owned.
    if (hierarchyParts.length >= 1) {
      delete filter.exam;
      delete filter.lesson;
      delete filter._id;
      filter.$or = [...hierarchyParts, owned];
    } else {
      Object.assign(filter, owned);
    }
    return filter;
  }

  if (hierarchyParts.length === 1) {
    Object.assign(filter, hierarchyParts[0]);
  } else if (hierarchyParts.length > 1) {
    filter.$or = hierarchyParts;
  }

  return filter;
}

export async function enrichQuestions(rows: Array<Record<string, unknown>>) {
  const examIds = rows
    .map((q) => q.exam)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => toObjectId(String(id)));
  const lessonIds = rows
    .map((q) => q.lesson)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => toObjectId(String(id)));

  const [exams, lessons] = await Promise.all([
    examIds.length
      ? Exam.find({ _id: { $in: examIds } })
          .populate("course", "title")
          .lean()
      : [],
    lessonIds.length
      ? Lesson.find({ _id: { $in: lessonIds } })
          .populate({ path: "chapter", select: "title course", populate: { path: "course", select: "title" } })
          .lean()
      : [],
  ]);

  const examMap = new Map(exams.map((e: any) => [String(e._id), e]));
  const lessonMap = new Map(lessons.map((l: any) => [String(l._id), l]));

  return rows.map((q) => {
    const examDoc = q.exam ? examMap.get(String(q.exam)) : null;
    const lessonDoc = q.lesson ? lessonMap.get(String(q.lesson)) : null;
    const courseFromExam = examDoc?.course as { _id?: unknown; title?: string } | undefined;
    const chapterFromLesson = lessonDoc?.chapter as
      | { _id?: unknown; title?: string; course?: { _id?: unknown; title?: string } }
      | undefined;

    const course =
      courseFromExam || chapterFromLesson?.course
        ? {
            _id: String((courseFromExam?._id ?? chapterFromLesson?.course?._id) || ""),
            title: String((courseFromExam?.title ?? chapterFromLesson?.course?.title) || ""),
          }
        : undefined;

    const chapter = chapterFromLesson
      ? { _id: String(chapterFromLesson._id), title: String(chapterFromLesson.title || "") }
      : undefined;

    const examInfo = examDoc
      ? { _id: String(examDoc._id), title: String(examDoc.title || "") }
      : undefined;

    const lessonInfo = lessonDoc
      ? { _id: String(lessonDoc._id), title: String((lessonDoc as any).title || "") }
      : undefined;

    return {
      ...q,
      _id: String(q._id),
      course,
      chapter,
      examInfo,
      lessonInfo,
    };
  });
}

export async function listQuestionBank(
  user: SessionUser,
  searchParams: URLSearchParams,
  options?: { forStats?: boolean },
) {
  const page = parsePage(searchParams);
  const limit = options?.forStats
    ? Number.MAX_SAFE_INTEGER
    : parseLimit(searchParams, 12, 100);
  const skip = options?.forStats ? 0 : (page - 1) * limit;
  const sortBy = (searchParams.get("sortBy") || "createdAt").trim();
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const allowedSort = new Set(["question", "createdAt", "updatedAt", "marks", "type", "difficulty"]);
  const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";

  const filter = await buildQuestionBankFilter(user, searchParams);
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

  if (user.role !== "instructor") {
    const [rows, total] = await Promise.all([
      Question.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Question.countDocuments(filter),
    ]);
    const questions = await enrichQuestions(rows as unknown as Array<Record<string, unknown>>);
    return { questions, pagination: pagination(page, limit, total), topics: [] as string[] };
  }

  // Instructor: own/course questions + shared Platform QB (active grant), excluding already-forked.
  const { buildGrantedPlatformQuestionFilter } = await import(
    "@/app/api/_lib/platformQuestionAccess"
  );
  const PlatformQuestion = (await import("@/models/PlatformQuestion")).default;

  const search = (searchParams.get("search") || "").trim();
  const type = (searchParams.get("type") || "").trim();
  const difficulty = (searchParams.get("difficulty") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const subjectParam = (searchParams.get("subject") || "").trim();
  const subjectNameParam = (searchParams.get("subjectName") || "").trim();
  const courseParam = (searchParams.get("course") || "").trim();
  const coursesParam = (searchParams.get("courses") || "").trim();
  const chapterParam = (searchParams.get("chapter") || "").trim();
  const lessonParam = (searchParams.get("lesson") || "").trim();
  const examParam = (searchParams.get("exam") || "").trim();
  const topicNameParam = (searchParams.get("topic") || "").trim();

  const topicCourseIds: mongoose.Types.ObjectId[] = [];
  if (courseParam && isObjectId(courseParam)) {
    topicCourseIds.push(toObjectId(courseParam));
  } else {
    for (const rawId of coursesParam.split(",")) {
      const id = rawId.trim();
      if (isObjectId(id)) topicCourseIds.push(toObjectId(id));
    }
  }

  const [ownRows, platformFilter] = await Promise.all([
    Question.find(filter).lean(),
    buildGrantedPlatformQuestionFilter(user.id),
  ]);

  const instructorTopics = options?.forStats
    ? []
    : await collectInstructorTopicNames({
        userId: user.id,
        subjectName: subjectNameParam,
        courseIds: topicCourseIds,
        platformFilter,
      });

  // Chapter/topic filters only match lesson-linked rows in Mongo. Also pull owned
  // Platform forks whose topic matches the selected title (Course QB parity).
  let forkExtra: Array<Record<string, unknown>> = [];
  let topicTitle = topicNameParam;
  if (!topicTitle && chapterParam && isObjectId(chapterParam)) {
    const chapterDoc = await Chapter.findById(chapterParam).select("title").lean();
    topicTitle = chapterDoc?.title ? String(chapterDoc.title).trim() : "";
  }
  if (topicTitle && !lessonParam) {
    const ownIds = new Set(ownRows.map((q) => String(q._id)));
    const forkFilter: Record<string, unknown> = {
      createdBy: toObjectId(user.id),
      sourcePlatformQuestionId: { $exists: true, $ne: null },
    };
    if (search) forkFilter.question = { $regex: escapeRegex(search), $options: "i" };
    if (type && type !== "all") forkFilter.type = type;
    if (difficulty && difficulty !== "all") forkFilter.difficulty = difficulty;
    if (status === "active") forkFilter.isActive = true;
    if (status === "inactive") forkFilter.isActive = false;
    const candidates = await Question.find(forkFilter).lean();
    const withMeta = await attachPlatformMetaToOwnRows(
      candidates as unknown as Array<Record<string, unknown>>,
    );
    forkExtra = withMeta.filter((q) => {
      if (ownIds.has(String(q._id))) return false;
      return rowMatchesTopic(q, topicTitle);
    });
  }

  const forkedIds = new Set(
    [...ownRows, ...forkExtra]
      .map((q) => q.sourcePlatformQuestionId)
      .filter(Boolean)
      .map((id) => String(id)),
  );

  // Shared Platform QB only maps to subject/topic. Lesson- or exam-level selections
  // have no platform equivalent, so those views should not include shared rows.
  const lessonOrExamSelected =
    (lessonParam && isObjectId(lessonParam)) || (examParam && isObjectId(examParam));
  const hasHierarchySelection =
    (courseParam && isObjectId(courseParam)) ||
    Boolean(coursesParam) ||
    Boolean(subjectNameParam) ||
    (chapterParam && isObjectId(chapterParam));

  let scopeClause: Record<string, unknown> | null = null;
  let dropShared = Boolean(lessonOrExamSelected);
  if (!dropShared && chapterParam && isObjectId(chapterParam)) {
    // Prefer a concrete course id when available so chapter→course subject resolves.
    const courseForScope =
      (courseParam && isObjectId(courseParam) && courseParam) ||
      coursesParam.split(",").map((id) => id.trim()).find((id) => isObjectId(id)) ||
      "";
    scopeClause = await buildPlatformScopeClause(courseForScope, chapterParam);
    if (!scopeClause) dropShared = true;
  } else if (!dropShared && subjectNameParam) {
    const subjectClause: Record<string, unknown> = {
      subject: {
        $regex: `^${escapeRegex(subjectNameParam)}$`,
        $options: "i",
      },
    };
    scopeClause = topicNameParam
      ? {
          $and: [
            subjectClause,
            {
              topic: {
                $regex: `^${escapeRegex(topicNameParam)}$`,
                $options: "i",
              },
            },
          ],
        }
      : subjectClause;
  } else if (!dropShared && topicNameParam) {
    scopeClause = {
      topic: {
        $regex: `^${escapeRegex(topicNameParam)}$`,
        $options: "i",
      },
    };
  } else if (!dropShared && hasHierarchySelection) {
    scopeClause = await buildPlatformScopeClause(courseParam, chapterParam);
    if (!scopeClause) dropShared = true;
  }

  let sharedRows: Array<Record<string, unknown>> = [];
  if (platformFilter && !dropShared) {
    const pf: Record<string, unknown> = { ...platformFilter };
    if (subjectParam && isObjectId(subjectParam)) {
      pf.subjectId = toObjectId(subjectParam);
    }
    if (search) pf.questionText = { $regex: escapeRegex(search), $options: "i" };
    if (type === "mcq" || type === "written") {
      pf.questionFormat = type;
    }
    if (difficulty && difficulty !== "all") {
      const map: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
      if (map[difficulty]) pf.difficulty = map[difficulty];
    }
    if (status === "active") pf.isActive = true;
    if (status === "inactive") pf.isActive = false;
    if (scopeClause) {
      const existingAnd = Array.isArray(pf.$and)
        ? (pf.$and as Record<string, unknown>[])
        : [];
      pf.$and = [...existingAnd, scopeClause];
    }

    const raw = await PlatformQuestion.find(pf).limit(5000).lean();
    sharedRows = raw
      .filter((r) => !forkedIds.has(String(r._id)))
      .map((r) => mapPlatformToBankRow(r as Record<string, unknown>));
  }

  const ownMapped = await enrichQuestions(
    [...ownRows, ...forkExtra] as unknown as Array<Record<string, unknown>>,
  );
  const ownWithPlatformMeta = await attachPlatformMetaToOwnRows(
    ownMapped as Array<Record<string, unknown>>,
  );
  const ownWithMeta = ownWithPlatformMeta.map((q) => ({
    ...q,
    isSharedPlatform: false,
    isForked: Boolean((q as { sourcePlatformQuestionId?: string }).sourcePlatformQuestionId),
  }));

  let merged = [...ownWithMeta, ...sharedRows] as Array<Record<string, unknown>>;
  if (topicNameParam) {
    merged = merged.filter((q) => rowMatchesTopic(q, topicNameParam));
  }
  merged.sort((a, b) => {
    if (sortField === "question") {
      const as = String(a.question || "");
      const bs = String(b.question || "");
      return sortOrder === 1 ? as.localeCompare(bs) : bs.localeCompare(as);
    }
    if (sortField === "marks" || sortField === "type" || sortField === "difficulty") {
      const as = String(a[sortField] ?? "");
      const bs = String(b[sortField] ?? "");
      return sortOrder === 1 ? as.localeCompare(bs) : bs.localeCompare(as);
    }
    const at = a[sortField] ? new Date(String(a[sortField])).getTime() : 0;
    const bt = b[sortField] ? new Date(String(b[sortField])).getTime() : 0;
    return sortOrder === 1 ? at - bt : bt - at;
  });

  const total = merged.length;
  if (options?.forStats) {
    return {
      questions: merged.map((q) => ({
        type: q.type,
        difficulty: q.difficulty,
        marks: q.marks,
        isActive: q.isActive,
      })),
      pagination: pagination(1, total, total),
      topics: instructorTopics,
    };
  }

  const pageRows = merged.slice(skip, skip + limit);

  return {
    questions: pageRows,
    pagination: pagination(page, limit, total),
    topics: instructorTopics,
  };
}

function mapPlatformToBankRow(r: Record<string, unknown>) {
  const difficultyMap: Record<number, string> = { 1: "easy", 2: "medium", 3: "hard" };
  const format = r.questionFormat === "written" ? "written" : "mcq";
  const subject = r.subject ? String(r.subject) : undefined;
  const topic = r.topic ? String(r.topic) : undefined;
  const subtopic = r.subtopic ? String(r.subtopic) : undefined;
  return {
    _id: `platform:${String(r._id)}`,
    platformQuestionId: String(r._id),
    question: String(r.questionText || ""),
    type: format,
    marks: Number(r.marks) > 0 ? Number(r.marks) : 1,
    difficulty: difficultyMap[Number(r.difficulty)] || "medium",
    category: subject,
    subject,
    subjectCode: r.subjectCode ? String(r.subjectCode) : undefined,
    topic,
    subtopic,
    qid: r.qid ? String(r.qid) : undefined,
    year: r.year != null ? Number(r.year) : undefined,
    session: r.session ? String(r.session) : undefined,
    paper: r.paper ? String(r.paper) : undefined,
    questionNumber: r.questionNumber ? String(r.questionNumber) : undefined,
    tags: [
      "platform-shared",
      subject || "",
      topic || "",
    ].filter(Boolean),
    options: Array.isArray(r.options) ? r.options : [],
    correctAnswer: r.answerText ? String(r.answerText) : undefined,
    explanation: r.explanation ? String(r.explanation) : undefined,
    isActive: r.isActive !== false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    isSharedPlatform: true,
    isForked: false,
    sourcePlatformQuestionId: String(r._id),
    sourceType: r.sourceType ? String(r.sourceType) : undefined,
  };
}

/** Attach Platform QB metadata (qid/subject/topic/…) onto forked bank rows. */
async function attachPlatformMetaToOwnRows(
  rows: Array<Record<string, unknown>>,
) {
  const sourceIds = [
    ...new Set(
      rows
        .map((q) => q.sourcePlatformQuestionId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
        .map((id) => String(id)),
    ),
  ];
  if (!sourceIds.length) return rows;

  const PlatformQuestion = (await import("@/models/PlatformQuestion")).default;
  const sources = await PlatformQuestion.find({
    _id: { $in: sourceIds.map((id) => toObjectId(id)) },
  })
    .select(
      "qid subject subjectCode topic subtopic year session paper questionNumber sourceType marks",
    )
    .lean();

  const byId = new Map(sources.map((s) => [String(s._id), s as Record<string, unknown>]));

  return rows.map((q) => {
    const srcId = q.sourcePlatformQuestionId
      ? String(q.sourcePlatformQuestionId)
      : "";
    const src = srcId ? byId.get(srcId) : undefined;
    if (!src) return q;
    return {
      ...q,
      qid: q.qid || (src.qid ? String(src.qid) : undefined),
      subject: q.subject || (src.subject ? String(src.subject) : undefined),
      subjectCode:
        q.subjectCode || (src.subjectCode ? String(src.subjectCode) : undefined),
      topic: q.topic || (src.topic ? String(src.topic) : undefined),
      subtopic: q.subtopic || (src.subtopic ? String(src.subtopic) : undefined),
      year: q.year ?? (src.year != null ? Number(src.year) : undefined),
      session: q.session || (src.session ? String(src.session) : undefined),
      paper: q.paper || (src.paper ? String(src.paper) : undefined),
      questionNumber:
        q.questionNumber ||
        (src.questionNumber ? String(src.questionNumber) : undefined),
      sourceType:
        q.sourceType || (src.sourceType ? String(src.sourceType) : undefined),
      category:
        q.category ||
        (src.subject ? String(src.subject) : undefined) ||
        q.category,
    };
  });
}

export async function statsQuestionBank(user: SessionUser, searchParams: URLSearchParams) {
  if (user.role !== "instructor") {
    const filter = await buildQuestionBankFilter(user, searchParams);
    const rows = await Question.find(filter).select("type difficulty marks isActive").lean();
    return buildQuestionStats(rows as unknown as Array<Record<string, unknown>>);
  }

  // Must use the full merged set — list pagination is capped (max 100) and would
  // under-count overview totals vs the question list "of N" total.
  const listed = await listQuestionBank(user, searchParams, { forStats: true });
  return buildQuestionStats(listed.questions as Array<Record<string, unknown>>);
}

/** Instructor may mutate questions linked to their courses (not only createdBy). */
export async function instructorCanAccessQuestion(
  userId: string,
  questionId: string,
): Promise<boolean> {
  if (!isObjectId(questionId)) return false;
  const q = await Question.findById(questionId).lean();
  if (!q) return false;

  // Own questions (including Platform QB borrow copies) always allowed.
  if (String(q.createdBy) === userId) return true;

  const allowedCourseIds = await resolveAccessibleCourseIds(userId, "instructor");
  if (!allowedCourseIds?.length) return false;

  if (q.exam) {
    const exam = await Exam.findById(q.exam).select("course").lean();
    if (exam?.course && allowedCourseIds.some((id) => id.equals(exam.course as mongoose.Types.ObjectId))) {
      return true;
    }
  }
  if (q.lesson) {
    const lesson = await Lesson.findById(q.lesson).select("chapter").lean();
    if (!lesson?.chapter) return false;
    const chapter = await Chapter.findById(lesson.chapter).select("course").lean();
    if (chapter?.course && allowedCourseIds.some((id) => id.equals(chapter.course as mongoose.Types.ObjectId))) {
      return true;
    }
  }
  return false;
}

export async function getInstructorCourseIds(userId: string) {
  return resolveAccessibleCourseIds(userId, "instructor");
}
