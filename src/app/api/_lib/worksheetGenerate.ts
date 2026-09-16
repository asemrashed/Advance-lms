import Question from "@/models/Question";
import PlatformQuestion from "@/models/PlatformQuestion";
import { isObjectId, toObjectId, type AppRole } from "@/app/api/_lib/phase12";
import { instructorCanAccessQuestion } from "@/app/api/_lib/questionBank";
import { instructorCanViewAdminQuestion } from "@/app/api/_lib/platformQuestionAccess";
import { buildWorksheetPdfBuffer } from "@/lib/pdf/worksheetPdf";
import { persistPdfBuffer } from "@/lib/pdf/storePdf";

/** Course QB rows use real ObjectIds; shared Platform QB rows use `platform:<oid>`. */
export function parseBankQuestionId(
  raw: string,
): { kind: "course" | "platform"; id: string } | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (value.startsWith("platform:")) {
    const id = value.slice("platform:".length).trim();
    return isObjectId(id) ? { kind: "platform", id } : null;
  }
  return isObjectId(value) ? { kind: "course", id: value } : null;
}

function mapPlatformRowForPdf(q: Record<string, unknown>) {
  return {
    question: String(q.questionText ?? ""),
    type: q.questionFormat === "mcq" ? "mcq" : "written",
    marks: Number(q.marks ?? 1),
    options: Array.isArray(q.options)
      ? q.options.map((opt: { text?: string; isCorrect?: boolean }) => ({
          text: String(opt.text ?? ""),
          isCorrect: Boolean(opt.isCorrect),
        }))
      : undefined,
    correctAnswer: q.answerText ? String(q.answerText) : undefined,
  };
}

export async function assertStaffCanUseQuestions(
  role: AppRole,
  userId: string,
  questionIds: string[],
) {
  if (!questionIds.length) {
    return { error: "Select at least one question", questions: null as null };
  }

  const parsed = questionIds
    .map((id) => parseBankQuestionId(id))
    .filter((row): row is { kind: "course" | "platform"; id: string } => Boolean(row));

  if (!parsed.length) {
    return { error: "Invalid question selection", questions: null as null };
  }

  // Preserve first-seen order while deduping by kind+id.
  const seen = new Set<string>();
  const unique = parsed.filter((row) => {
    const key = `${row.kind}:${row.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const courseIds = unique.filter((r) => r.kind === "course").map((r) => r.id);
  const platformIds = unique.filter((r) => r.kind === "platform").map((r) => r.id);

  const [courseRows, platformRows] = await Promise.all([
    courseIds.length
      ? Question.find({
          _id: { $in: courseIds.map((id) => toObjectId(id)) },
          isActive: { $ne: false },
        }).lean()
      : Promise.resolve([]),
    platformIds.length
      ? PlatformQuestion.find({
          _id: { $in: platformIds.map((id) => toObjectId(id)) },
          isActive: { $ne: false },
        }).lean()
      : Promise.resolve([]),
  ]);

  const courseById = new Map(courseRows.map((q) => [String(q._id), q]));
  const platformById = new Map(platformRows.map((q) => [String(q._id), q]));

  if (courseIds.some((id) => !courseById.has(id)) || platformIds.some((id) => !platformById.has(id))) {
    return {
      error: "One or more questions were not found or are inactive",
      questions: null,
    };
  }

  if (role === "instructor") {
    for (const id of courseIds) {
      const allowed = await instructorCanAccessQuestion(userId, id);
      if (!allowed) {
        return {
          error: "You do not have access to one or more selected questions",
          questions: null,
        };
      }
    }
    for (const id of platformIds) {
      const row = platformById.get(id)!;
      const allowed = await instructorCanViewAdminQuestion(userId, {
        ownerType: String(row.ownerType || "admin"),
        subjectId: row.subjectId,
        subjectCode: row.subjectCode ? String(row.subjectCode) : undefined,
        subject: row.subject ? String(row.subject) : undefined,
        grade: row.grade ? String(row.grade) : undefined,
        topic: row.topic ? String(row.topic) : undefined,
      });
      if (!allowed) {
        return {
          error: "You do not have access to one or more selected questions",
          questions: null,
        };
      }
    }
  }

  const sorted = unique.map((row) => {
    if (row.kind === "platform") {
      return mapPlatformRowForPdf(platformById.get(row.id) as Record<string, unknown>);
    }
    return courseById.get(row.id) as Record<string, unknown>;
  });

  return { error: null, questions: sorted };
}

/** Admin subject-scoped worksheets pull from the platform question bank. */
export async function assertStaffCanUsePlatformQuestions(questionIds: string[]) {
  if (!questionIds.length) {
    return { error: "Select at least one question", questions: null as null };
  }

  const unique = [
    ...new Set(
      questionIds
        .map((id) => parseBankQuestionId(id))
        .filter((row): row is { kind: "course" | "platform"; id: string } => Boolean(row))
        .map((row) => row.id)
        .filter((id) => isObjectId(id)),
    ),
  ];
  if (!unique.length) {
    return { error: "Invalid question selection", questions: null as null };
  }

  const rows = await PlatformQuestion.find({
    _id: { $in: unique.map((id) => toObjectId(id)) },
    isActive: { $ne: false },
  }).lean();

  if (rows.length !== unique.length) {
    return { error: "One or more questions were not found or are inactive", questions: null };
  }

  const order = new Map(unique.map((id, i) => [id, i]));
  const sorted = [...rows]
    .sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0))
    .map((q) => mapPlatformRowForPdf(q as Record<string, unknown>));

  return { error: null, questions: sorted };
}

/** ObjectIds safe to persist on ResourceWorksheet.questionIds (strip `platform:`). */
export function storeableQuestionObjectIds(questionIds: string[]) {
  const ids = [
    ...new Set(
      questionIds
        .map((id) => parseBankQuestionId(id)?.id)
        .filter((id): id is string => Boolean(id) && isObjectId(id!)),
    ),
  ];
  return ids.map((id) => toObjectId(id));
}

export async function generateWorksheetPdfFromQuestions(options: {
  title: string;
  subtitle?: string;
  questions: Array<Record<string, unknown>>;
  includeAnswers?: boolean;
}) {
  const buffer = await buildWorksheetPdfBuffer({
    title: options.title,
    subtitle: options.subtitle,
    includeAnswers: options.includeAnswers,
    questions: options.questions.map((q) => ({
      question: String(q.question ?? q.questionText ?? ""),
      type: String(q.type ?? q.questionFormat ?? "written"),
      marks: Number(q.marks ?? 1),
      options: Array.isArray(q.options)
        ? (q.options as { text?: string; isCorrect?: boolean }[]).map((opt) => ({
            text: String(opt.text ?? ""),
            isCorrect: Boolean(opt.isCorrect),
          }))
        : undefined,
      correctAnswer: q.correctAnswer
        ? String(q.correctAnswer)
        : q.answerText
          ? String(q.answerText)
          : undefined,
    })),
  });

  return persistPdfBuffer(buffer);
}
