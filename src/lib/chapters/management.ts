import mongoose from "mongoose";
import Chapter from "@/models/Chapter";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import Subject from "@/models/Subject";
import { normalizeSubjectChapters } from "@/lib/subjectChapters";
import { isAdminAreaRole } from "@/lib/roles";

export type ChapterAccessRole = "super_admin" | "admin" | "instructor";

type ChapterListParams = {
  userId: string;
  role: ChapterAccessRole;
  query: URLSearchParams;
};

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function mapChapterRow(
  chapter: Record<string, unknown>,
  lessonCount?: number,
) {
  return {
    _id: String(chapter._id),
    title: (chapter.title as string) || "",
    description: (chapter.description as string) || undefined,
    course: String(chapter.course),
    batchId: chapter.batchId ? String(chapter.batchId) : undefined,
    topicDriveUrl: (chapter.topicDriveUrl as string) || undefined,
    order: typeof chapter.order === "number" ? chapter.order : 0,
    isPublished: Boolean(chapter.isPublished),
    lessonCount: typeof lessonCount === "number" ? lessonCount : 0,
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt,
  };
}

async function lessonCountsByChapterIds(
  chapterIds: mongoose.Types.ObjectId[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (chapterIds.length === 0) return map;
  const rows = await Lesson.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { chapter: { $in: chapterIds } } },
    { $group: { _id: "$chapter", count: { $sum: 1 } } },
  ]);
  for (const row of rows) {
    map.set(String(row._id), row.count);
  }
  return map;
}

export async function resolveAccessibleCourseIds(
  userId: string,
  role: ChapterAccessRole,
): Promise<mongoose.Types.ObjectId[] | null> {
  if (isAdminAreaRole(role)) {
    return null;
  }
  const rows = await Course.find({
    $or: [{ instructor: userId }, { createdBy: userId }],
  })
    .select("_id")
    .lean();
  return rows.map((row: any) => new mongoose.Types.ObjectId(String(row._id)));
}

export async function assertCanManageCourse(
  courseId: string,
  userId: string,
  role: ChapterAccessRole,
): Promise<{ ok: true; course: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return { ok: false, status: 400, error: "Invalid course ID" };
  }
  const course = await Course.findById(courseId)
    .select("_id instructor createdBy subjectId")
    .lean();
  if (!course) {
    return { ok: false, status: 404, error: "Course not found" };
  }
  if (isAdminAreaRole(role)) {
    return { ok: true, course: course as Record<string, unknown> };
  }
  const allowed =
    String(course.instructor || "") === userId ||
    String(course.createdBy || "") === userId;
  if (!allowed) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, course: course as Record<string, unknown> };
}

/** Subject chapter catalog for Curriculum Builder → Add Chapter. */
export async function listSubjectChapterCatalogForCourse(courseId: string) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error("invalid_course");
  }

  const course = await Course.findById(courseId).select("subjectId").lean();
  if (!course) {
    throw new Error("course_not_found");
  }

  const subjectId = course.subjectId ? String(course.subjectId) : "";
  if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
    return { catalog: [] as Array<{ name: string; order: number; chapterId: string | null; lessonCount: number }> };
  }

  const [subject, existing] = await Promise.all([
    Subject.findById(subjectId).select("chapters").lean(),
    Chapter.find({ course: courseId }).select("_id title order").lean(),
  ]);

  const subjectChapters = normalizeSubjectChapters(
    (subject as { chapters?: unknown } | null)?.chapters,
  );
  const byTitle = new Map(
    existing.map((row) => [
      String(row.title || "").trim().toLowerCase(),
      row,
    ]),
  );
  const counts = await lessonCountsByChapterIds(
    existing.map((row) => row._id as mongoose.Types.ObjectId),
  );

  return {
    catalog: subjectChapters.map((ch) => {
      const match = byTitle.get(ch.name.toLowerCase());
      const chapterId = match ? String(match._id) : null;
      return {
        name: ch.name,
        order: ch.order,
        chapterId,
        lessonCount: chapterId ? counts.get(chapterId) || 0 : 0,
      };
    }),
  };
}

/**
 * Opt a subject chapter onto a course. Reuses an existing course Chapter with
 * the same title when present (legacy auto-seeded rows).
 */
export async function createChapterFromSubjectCatalog(params: {
  courseId: string;
  title: string;
  userId: string;
  role: ChapterAccessRole;
}) {
  const access = await assertCanManageCourse(
    params.courseId,
    params.userId,
    params.role,
  );
  if (!access.ok) {
    return access;
  }

  const title = String(params.title || "").trim();
  if (!title) {
    return { ok: false as const, status: 400, error: "Chapter title is required" };
  }

  const subjectId = access.course.subjectId
    ? String(access.course.subjectId)
    : "";
  if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
    return {
      ok: false as const,
      status: 400,
      error: "This course has no subject. Assign a subject before adding chapters.",
    };
  }

  const subject = await Subject.findById(subjectId).select("chapters").lean();
  if (!subject) {
    return { ok: false as const, status: 400, error: "Subject not found" };
  }

  const subjectChapters = normalizeSubjectChapters(
    (subject as { chapters?: unknown }).chapters,
  );
  const catalogEntry = subjectChapters.find(
    (ch) => ch.name.toLowerCase() === title.toLowerCase(),
  );
  if (!catalogEntry) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Select a chapter from the subject catalog (Admin → Subjects). Custom chapter names are not allowed.",
    };
  }

  const courseObjectId = new mongoose.Types.ObjectId(params.courseId);
  const existing = await Chapter.findOne({
    course: courseObjectId,
    title: { $regex: `^${catalogEntry.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  }).lean();

  if (existing) {
    const counts = await lessonCountsByChapterIds([
      existing._id as mongoose.Types.ObjectId,
    ]);
    return {
      ok: true as const,
      created: false,
      chapter: mapChapterRow(
        existing as Record<string, unknown>,
        counts.get(String(existing._id)) || 0,
      ),
    };
  }

  const created = await Chapter.create({
    title: catalogEntry.name,
    course: courseObjectId,
    // Append at bottom: oldest chapters stay first in curriculum.
    order:
      ((
        await Chapter.findOne({ course: courseObjectId })
          .sort({ order: -1 })
          .select("order")
          .lean()
      )?.order ?? 0) + 1,
    isPublished: true,
  });

  return {
    ok: true as const,
    created: true,
    chapter: mapChapterRow(created.toObject() as Record<string, unknown>, 0),
  };
}

export async function listManagedChapters({
  userId,
  role,
  query,
}: ChapterListParams) {
  const course = (query.get("course") || query.get("courseId") || "").trim();
  const batchId = (query.get("batchId") || "").trim();
  const search = (query.get("search") || query.get("q") || "").trim();
  const isPublishedParam = query.get("isPublished");
  const includeCatalog = query.get("includeCatalog") === "1" || query.get("includeCatalog") === "true";
  const withLessonsOnly =
    query.get("withLessons") === "1" || query.get("withLessons") === "true";
  const page = toPositiveInt(query.get("page"), 1);
  const limit = Math.min(toPositiveInt(query.get("limit"), 10), 500);
  const sortBy = (query.get("sortBy") || "order").trim();
  const sortOrder = (query.get("sortOrder") || "asc").trim() === "desc" ? -1 : 1;

  const allowedSort: Record<string, 1 | -1> = {
    title: sortOrder,
    order: sortOrder,
    createdAt: sortOrder,
    updatedAt: sortOrder,
  };
  const sort = allowedSort[sortBy]
    ? { [sortBy]: allowedSort[sortBy] as 1 | -1 }
    : { order: 1 as 1 };

  const filter: Record<string, unknown> = {};
  const andClauses: Record<string, unknown>[] = [];

  if (course) {
    if (!mongoose.Types.ObjectId.isValid(course)) {
      throw new Error("invalid_course");
    }
    filter.course = new mongoose.Types.ObjectId(course);
  }
  if (batchId) {
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      throw new Error("invalid_batch");
    }
    // batchId query is kept for API compatibility; curriculum is course-shared
    // so we do not filter chapters by section.
  } else if (course && query.get("batchId") === "") {
    filter.batchId = { $exists: false };
  }
  if (search) {
    andClauses.push({
      $or: [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    });
  }
  if (andClauses.length === 1) {
    Object.assign(filter, andClauses[0]);
  } else if (andClauses.length > 1) {
    filter.$and = andClauses;
  }
  if (isPublishedParam === "true") {
    filter.isPublished = true;
  } else if (isPublishedParam === "false") {
    filter.isPublished = false;
  }

  const accessibleCourseIds = await resolveAccessibleCourseIds(userId, role);
  if (accessibleCourseIds) {
    if (accessibleCourseIds.length === 0) {
      return {
        chapters: [],
        catalog: includeCatalog ? [] : undefined,
        pagination: { page, limit, total: 0, pages: 0 },
        stats: { total: 0, published: 0, unpublished: 0 },
      };
    }
    if (filter.course) {
      const requested = String(filter.course);
      const allowed = accessibleCourseIds.some((id) => String(id) === requested);
      if (!allowed) {
        return {
          chapters: [],
          catalog: includeCatalog ? [] : undefined,
          pagination: { page, limit, total: 0, pages: 0 },
          stats: { total: 0, published: 0, unpublished: 0 },
        };
      }
    } else {
      filter.course = { $in: accessibleCourseIds };
    }
  }

  const skip = (page - 1) * limit;
  const [chapters, total, statRows] = await Promise.all([
    Chapter.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Chapter.countDocuments(filter),
    Chapter.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ["$isPublished", true] }, 1, 0] },
          },
          unpublished: {
            $sum: { $cond: [{ $eq: ["$isPublished", false] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const counts = await lessonCountsByChapterIds(
    chapters.map((chapter: any) => chapter._id as mongoose.Types.ObjectId),
  );

  let mapped = chapters.map((chapter: any) =>
    mapChapterRow(chapter, counts.get(String(chapter._id)) || 0),
  );

  if (withLessonsOnly) {
    mapped = mapped.filter((chapter) => (chapter.lessonCount || 0) > 0);
  }

  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  const stats = statRows[0] || { total: 0, published: 0, unpublished: 0 };

  let catalog:
    | Array<{
        name: string;
        order: number;
        chapterId: string | null;
        lessonCount: number;
      }>
    | undefined;
  if (includeCatalog && course) {
    const catalogResult = await listSubjectChapterCatalogForCourse(course);
    catalog = catalogResult.catalog;
  }

  return {
    chapters: mapped,
    ...(catalog ? { catalog } : {}),
    pagination: { page, limit, total, pages },
    stats,
  };
}
