import Subject from "@/models/Subject";
import Course from "@/models/Course";
import Chapter from "@/models/Chapter";
import PlatformQuestion from "@/models/PlatformQuestion";
import { normalizeSubjectCode, toSubjectSlug } from "@/lib/subjectUtils";
import { formatResourceSubjectOptionLabel } from "@/lib/courseLabel";
import {
  normalizeSubjectChapters,
  type SubjectChapterInput,
} from "@/lib/subjectChapters";
import {
  normalizeSubjectComponents,
  isObjectIdString,
  type SubjectComponentInput,
} from "@/lib/subjectComponents";
import mongoose from "mongoose";

export function mapSubjectChapters(raw: unknown): SubjectChapterInput[] {
  return normalizeSubjectChapters(raw);
}

export function mapSubjectComponents(raw: unknown): SubjectComponentInput[] {
  return normalizeSubjectComponents(raw).map((c) => ({
    ...c,
    _id: c._id || "",
  }));
}

/** Map for Mongoose subdocument create/update (preserves _id when provided). */
export function toSubjectComponentDocs(components: SubjectComponentInput[]) {
  return components.map((c) => {
    const doc: {
      _id?: mongoose.Types.ObjectId;
      name: string;
      type: SubjectComponentInput["type"];
      order: number;
    } = {
      name: c.name,
      type: c.type,
      order: c.order,
    };
    if (c._id && isObjectIdString(c._id)) {
      doc._id = new mongoose.Types.ObjectId(c._id);
    }
    return doc;
  });
}

export function mapSubject(
  doc: Record<string, unknown>,
  counts?: { courseCount?: number; questionCount?: number },
) {
  return {
    _id: String(doc._id),
    name: String(doc.name || ""),
    code: String(doc.code || ""),
    slug: String(doc.slug || ""),
    grade: doc.grade ? String(doc.grade) : undefined,
    optionLabel: formatResourceSubjectOptionLabel({
      name: String(doc.name || ""),
      code: String(doc.code || ""),
      grade: doc.grade ? String(doc.grade) : undefined,
    }),
    chapters: mapSubjectChapters(doc.chapters),
    components: mapSubjectComponents(doc.components).map((c) => ({
      _id: String(c._id || ""),
      name: c.name,
      type: c.type,
      order: c.order,
    })),
    qbAccessPrice:
      doc.qbAccessPrice != null && Number.isFinite(Number(doc.qbAccessPrice))
        ? Number(doc.qbAccessPrice)
        : undefined,
    isActive: doc.isActive !== false,
    courseCount: counts?.courseCount ?? 0,
    questionCount: counts?.questionCount ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function countCoursesForSubject(subject: {
  _id: unknown;
  code?: string;
  name?: string;
  slug?: string;
}) {
  const id = String(subject._id);
  const code = String(subject.code || "").trim();
  const name = String(subject.name || "").trim();
  const slug = String(subject.slug || "").trim();
  return Course.countDocuments({
    $or: [
      { subjectId: id },
      ...(code ? [{ subjectCode: code }] : []),
      ...(name ? [{ subjectName: name }, { category: name }] : []),
      ...(slug ? [{ category: slug }] : []),
    ],
  });
}

export async function countQuestionsForSubject(subject: {
  _id?: unknown;
  code?: string;
  name?: string;
}) {
  const id = subject._id ? String(subject._id) : "";
  const code = String(subject.code || "").trim().toUpperCase();
  const name = String(subject.name || "").trim();
  const clauses: Record<string, unknown>[] = [];
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    clauses.push({ subjectId: new mongoose.Types.ObjectId(id) });
  }
  if (code) clauses.push({ subjectCode: code });
  if (name) {
    clauses.push({
      subject: {
        $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });
  }
  if (!clauses.length) return 0;
  return PlatformQuestion.countDocuments({ $or: clauses });
}

export async function resolveSubjectByCode(code: string) {
  const normalized = normalizeSubjectCode(code);
  if (!normalized) return null;
  return Subject.findOne({ code: normalized, isActive: { $ne: false } }).lean();
}

export async function resolveSubjectByName(name: string) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  return Subject.findOne({
    name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    isActive: { $ne: false },
  }).lean();
}

export async function resolveSubjectById(id: string) {
  return Subject.findById(id).lean();
}

export function buildSubjectFieldsFromBody(body: Record<string, unknown>) {
  const subjectId = String(body.subjectId || "").trim();
  const subjectCode = normalizeSubjectCode(body.subjectCode);
  const subjectName = String(body.subjectName || body.subject || "").trim();
  const grade = String(body.grade || "").trim().toUpperCase();

  return { subjectId, subjectCode, subjectName, grade };
}

export async function enrichSubjectFields(
  fields: ReturnType<typeof buildSubjectFieldsFromBody>,
) {
  let { subjectId, subjectCode, subjectName, grade } = fields;

  if (subjectId) {
    const doc = await resolveSubjectById(subjectId);
    if (doc) {
      subjectCode = String(doc.code || subjectCode);
      subjectName = String(doc.name || subjectName);
    }
  } else if (subjectCode) {
    const doc = await resolveSubjectByCode(subjectCode);
    if (doc) {
      subjectId = String(doc._id);
      subjectName = String(doc.name || subjectName);
    }
  }

  return { subjectId, subjectCode, subjectName, grade };
}

export function validateSubjectPayload(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const code = normalizeSubjectCode(body.code);
  if (!name) return { error: "Subject name is required" as const };
  if (!code) return { error: "Subject code is required" as const };
  if (!/^[A-Z0-9/_-]{2,15}$/.test(code)) {
    return { error: "Subject code must be 2–15 letters, numbers, or slashes (e.g. 2345/2)" as const };
  }
  const slug = toSubjectSlug(name);
  if (!slug) return { error: "Invalid subject name" as const };
  const grade = String(body.grade || "").trim().toUpperCase() || undefined;
  const chapters =
    body.chapters !== undefined ? normalizeSubjectChapters(body.chapters) : undefined;
  if (chapters !== undefined && chapters.length === 0) {
    return { error: "Add at least one chapter for this subject" as const };
  }
  const components =
    body.components !== undefined
      ? normalizeSubjectComponents(body.components)
      : undefined;
  if (components !== undefined && components.length === 0) {
    return { error: "Add at least one exam component (MCQ or Written)" as const };
  }
  return { name, code, slug, grade, chapters, components };
}

/**
 * Resolve a subject component by id from a subject document.
 */
export async function resolveSubjectComponent(params: {
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  componentId?: string;
}) {
  const componentId = String(params.componentId || "").trim();
  if (!componentId || !mongoose.Types.ObjectId.isValid(componentId)) {
    return { error: "Exam component is required" as const };
  }

  let subject =
    params.subjectId && mongoose.Types.ObjectId.isValid(params.subjectId)
      ? await Subject.findById(params.subjectId).lean()
      : null;

  if (!subject && params.subjectCode) {
    subject = await resolveSubjectByCode(params.subjectCode);
  }
  if (!subject && params.subjectName) {
    subject = await resolveSubjectByName(params.subjectName);
  }
  if (!subject) {
    return { error: "Subject not found for component" as const };
  }

  const components = normalizeSubjectComponents(
    (subject as { components?: unknown }).components,
  );
  const match = components.find((c) => c._id === componentId);
  if (!match || !match._id) {
    return { error: "Selected component does not belong to this subject" as const };
  }

  return {
    subject,
    component: match,
    subjectId: String(subject._id),
    subjectName: String(subject.name || ""),
    subjectCode: String(subject.code || ""),
  };
}

/**
 * Ensure the subject exists and defines at least one chapter.
 * Instructors opt chapters onto a course via Curriculum Builder → Add Chapter.
 */
export async function assertSubjectHasChapters(subjectId?: string) {
  const id = String(subjectId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return {
      chapters: [] as ReturnType<typeof normalizeSubjectChapters>,
      error: "Subject is required to create a course" as const,
    };
  }

  const subject = await Subject.findById(id).lean();
  if (!subject) {
    return {
      chapters: [] as ReturnType<typeof normalizeSubjectChapters>,
      error: "Subject not found" as const,
    };
  }

  const chapters = normalizeSubjectChapters(
    (subject as { chapters?: unknown }).chapters,
  );
  if (!chapters.length) {
    return {
      chapters,
      error:
        "This subject has no chapters. Add chapters on the subject first." as const,
    };
  }

  return { chapters };
}

/**
 * Copy subject chapters onto a course as Chapter documents.
 * Prefer instructor-driven Add Chapter; kept for migrations / one-off scripts.
 */
export async function seedCourseChaptersFromSubject(params: {
  courseId: mongoose.Types.ObjectId | string;
  subjectId?: string;
}) {
  const checked = await assertSubjectHasChapters(params.subjectId);
  if (checked.error) {
    return { seeded: 0, error: checked.error };
  }

  const courseObjectId =
    typeof params.courseId === "string"
      ? new mongoose.Types.ObjectId(params.courseId)
      : params.courseId;

  await Chapter.insertMany(
    checked.chapters.map((ch) => ({
      title: ch.name,
      course: courseObjectId,
      order: ch.order,
      isPublished: true,
    })),
  );

  return { seeded: checked.chapters.length };
}
