/**
 * Past-paper QP + MS extractor (Claude vision).
 *
 * Reads the two uploaded PDFs (question paper + mark scheme) from PDF storage
 * (local cache / Mongo), base64-encodes them, and sends them as two `document`
 * content blocks to Claude. The model returns a JSON array of questions matching
 * the client's past-paper schema, which we normalize into `PlatformQuestion` drafts.
 *
 * Uses the same raw-fetch pattern as `platformQuestionGenerate.ts`. Model is
 * `ANTHROPIC_MODEL_PASTPAPER` (default `claude-haiku-4-5`, the client's choice).
 */
import { extractSyllabusCode } from "@/lib/subjectUtils";
import { enrichSubjectFields } from "@/app/api/_lib/subjects";
import Subject from "@/models/Subject";
import { sanitizePdfPublicId, pdfPublicUrl } from "@/lib/pdf/extractPdfText";
import { readPdfBuffer } from "@/lib/pdf/pdfStorage";
import PlatformQuestion from "@/models/PlatformQuestion";
import {
  normalizeSubjectChapters,
  topicsFromSubjectChapters,
  type TopicRef,
} from "@/lib/subjectChapters";
import {
  buildPastPaperQid,
  mergePaperMeta,
  parseCambridgePaperCode,
  parsePaperFilename,
  resolveDisplayQid,
  type PaperMeta,
} from "@/lib/pastPaperCode";
import {
  normalizePastPaperQuestion,
  type NormalizedPastPaperQuestion,
  type PastPaperQuestionDraft,
} from "@/lib/pastPaperQuestion";
import type { SessionUser } from "@/app/api/_lib/phase12";
import { serializePlatformQuestion } from "@/app/api/_lib/platformQuestions";

export { parsePaperCode } from "@/lib/pastPaperCode";
export { buildPastPaperQid } from "@/lib/pastPaperCode";

export function pastPaperModel() {
  return process.env.ANTHROPIC_MODEL_PASTPAPER?.trim() || "claude-haiku-4-5";
}

async function readPdfBase64(publicId: string): Promise<string> {
  const safe = sanitizePdfPublicId(publicId);
  if (!safe) throw new Error("INVALID_PDF_PUBLIC_ID");
  const buffer = await readPdfBuffer(safe);
  if (!buffer) throw new Error("PDF_NOT_FOUND");
  return buffer.toString("base64");
}

function buildPrompt(
  meta: PaperMeta,
  topics: TopicRef[],
  paperCodeHint?: string,
): string {
  const topicList = topics.map((t) => `${t.number}. ${t.name}`).join("\n");
  const metaHint = [
    meta.subjectCode ? `Syllabus: ${meta.subjectCode}` : "",
    meta.subject ? `Subject: ${meta.subject}` : "",
    meta.year ? `Year: ${meta.year}` : "",
    meta.session ? `Session: ${meta.session}` : "",
    meta.paper ? `Paper: ${meta.paper}` : "",
    meta.variant ? `Variant: ${meta.variant}` : "",
    paperCodeHint ? `Paper code: ${paperCodeHint}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return `You are processing a Cambridge IGCSE past paper. Extract EVERY question and sub-part from the QP and MS.

Paper naming: syllabus_sessionYear_variant (e.g. 0606_s24_21)
Sessions: m = Feb/March (FM), s = May/June (MJ), w = Oct/Nov (ON)
Variant 1x = Paper 1 (P1), Variant 2x = Paper 2 (P2)

You are given TWO PDFs: the first is the QUESTION PAPER (QP), the second is the MARK SCHEME (MS). Read both together. For EACH distinct question (and clearly separable sub-question) in the question paper, produce one object. Match it to its answer in the mark scheme.

${metaHint ? `Paper context: ${metaHint}.\n` : ""}Classify each question into exactly one topic from this FIXED subject chapter list (use the NUMBER). Do NOT invent new topic names — only use numbers from this list:
${topicList}

Return your extraction by calling the \`submit_past_paper_questions\` tool with all questions.
Do NOT reply with raw JSON text or markdown fences.

Rules:
- topicNumber MUST be one of the numbers above.
- Set year, session (FM/MJ/ON), and paper (P1 or P2) on EVERY question from the paper cover / filename context above.
- questionNumber is the on-paper reference (e.g. 1a, 1(a)(i), 7(b)).
- Transcribe questionText and msText as completely as possible; do NOT invent content that is not in the PDFs.
- Set hasDiagram=YES whenever a diagram is needed even if you cannot render it — a human will attach the image later.
- Skip cover pages, instructions, and blank pages.
- Prefer accuracy over quantity; omit anything you cannot read.`;
}

interface ExtractResult {
  questions: NormalizedPastPaperQuestion[];
  meta: PaperMeta;
  qpUrl: string;
  msUrl: string;
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) return fence[1].trim();
  const inline = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return inline ? inline[1].trim() : trimmed;
}

/** Pull the outermost `{...}` object from Claude text (handles preamble / fences). */
function extractJsonObject(text: string): string {
  const stripped = stripJsonFences(text.trim());
  const start = stripped.indexOf("{");
  if (start < 0) return stripped;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return stripped.slice(start, i + 1);
    }
  }

  return repairTruncatedJson(stripped.slice(start));
}

/** Close brackets on JSON truncated mid-stream (e.g. max_tokens). */
function repairTruncatedJson(partial: string): string {
  let s = partial.trim();
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace > 0) s = s.slice(0, lastBrace + 1);

  let braces = 0;
  let brackets = 0;
  for (const ch of s) {
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }
  while (brackets > 0) {
    s += "]";
    brackets--;
  }
  while (braces > 0) {
    s += "}";
    braces--;
  }
  return s;
}

const PAST_PAPER_SUBMIT_TOOL = {
  name: "submit_past_paper_questions",
  description:
    "Submit every extracted past-paper question with mark-scheme match and topic tags.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            questionNumber: { type: "string" },
            year: { type: "integer" },
            session: { type: "string", enum: ["FM", "MJ", "ON"] },
            paper: { type: "string", description: "P1 or P2" },
            topicNumber: { type: "integer" },
            subtopic: { type: "string" },
            difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
            questionText: { type: "string" },
            msText: { type: "string" },
            answerText: { type: "string" },
            marks: { type: "integer" },
            calculatorType: { type: "string" },
            hasDiagram: { type: "string", enum: ["YES", "NO"] },
            hasMsDiagram: { type: "string", enum: ["YES", "NO"] },
            confidence: { type: "string", enum: ["High", "Medium", "Low"] },
          },
          required: [
            "questionNumber",
            "year",
            "session",
            "paper",
            "topicNumber",
            "difficulty",
            "questionText",
            "msText",
          ],
        },
      },
    },
    required: ["questions"],
  },
};

type ClaudeContentBlock = {
  type: string;
  text?: string;
  name?: string;
  input?: { questions?: unknown[] };
};

function parseQuestionsPayload(data: {
  content?: ClaudeContentBlock[];
  stop_reason?: string | null;
}): { questions?: unknown[] } {
  const toolBlock = data.content?.find(
    (c) => c.type === "tool_use" && c.name === PAST_PAPER_SUBMIT_TOOL.name,
  );
  if (toolBlock?.input && Array.isArray(toolBlock.input.questions)) {
    return { questions: toolBlock.input.questions };
  }

  const text = (data.content ?? [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n")
    .trim();

  const candidates = [text, extractJsonObject(text), repairTruncatedJson(extractJsonObject(text))];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as { questions?: unknown[] };
      if (Array.isArray(parsed.questions)) return parsed;
    } catch {
      /* try next */
    }
  }

  console.error("Past-paper Claude JSON parse failed", {
    stop_reason: data.stop_reason,
    preview: text.slice(0, 600),
    hadToolUse: Boolean(toolBlock),
  });
  if (data.stop_reason === "max_tokens") {
    throw new Error("ANTHROPIC_PARSE_TRUNCATED");
  }
  throw new Error("ANTHROPIC_PARSE_ERROR");
}

/**
 * Extract past-paper questions from an uploaded QP + MS pair.
 * Throws `ANTHROPIC_*` / `PDF_*` error codes handled by the route.
 */
export async function extractPastPaperQuestions(params: {
  qpPublicId: string;
  msPublicId: string;
  paperCode?: string;
  qpFilename?: string;
  subjectId?: string;
  subjectCode?: string;
  subjectName?: string;
  grade?: string;
  user: SessionUser;
}): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY_NOT_CONFIGURED");

  const filePaperCode = params.qpFilename
    ? parsePaperFilename(params.qpFilename)
    : undefined;
  const manualPaperCode = params.paperCode?.trim() || undefined;
  const resolvedPaperCode = filePaperCode || manualPaperCode;

  const meta = mergePaperMeta(
    parseCambridgePaperCode(resolvedPaperCode || ""),
    parseCambridgePaperCode(manualPaperCode || ""),
  );

  const syllabusCode =
    params.subjectCode?.trim() ||
    meta.subjectCode ||
    extractSyllabusCode(resolvedPaperCode || manualPaperCode || "");
  if (syllabusCode) meta.subjectCode = syllabusCode;
  const subjectFields = await enrichSubjectFields({
    subjectId: params.subjectId || "",
    subjectCode: syllabusCode || params.subjectCode || "",
    subjectName: params.subjectName || meta.subject || "",
    grade: params.grade || "",
  });
  if (subjectFields.subjectName) meta.subject = subjectFields.subjectName;

  if (!subjectFields.subjectId) {
    throw new Error("SUBJECT_REQUIRED");
  }
  const subjectDoc = await Subject.findById(subjectFields.subjectId).lean();
  const topics = topicsFromSubjectChapters(
    normalizeSubjectChapters(
      (subjectDoc as { chapters?: unknown } | null)?.chapters,
    ),
  );
  if (!topics.length) {
    throw new Error("SUBJECT_CHAPTERS_REQUIRED");
  }

  const qpSafe = sanitizePdfPublicId(params.qpPublicId);
  const msSafe = sanitizePdfPublicId(params.msPublicId);
  if (!qpSafe || !msSafe) throw new Error("INVALID_PDF_PUBLIC_ID");

  const [qpData, msData] = await Promise.all([
    readPdfBase64(qpSafe),
    readPdfBase64(msSafe),
  ]);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: pastPaperModel(),
      max_tokens: 16384,
      temperature: 0.1,
      tools: [PAST_PAPER_SUBMIT_TOOL],
      tool_choice: { type: "tool", name: PAST_PAPER_SUBMIT_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "QUESTION PAPER (QP):" },
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: qpData,
              },
            },
            { type: "text", text: "MARK SCHEME (MS):" },
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: msData,
              },
            },
            { type: "text", text: buildPrompt(meta, topics, resolvedPaperCode) },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ANTHROPIC_API_ERROR:${res.status}:${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: ClaudeContentBlock[];
    stop_reason?: string | null;
  };

  const parsed = parseQuestionsPayload(data);

  const list = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions = list
    .map((raw) => {
      const row = raw as Record<string, unknown>;
      const rowMeta = mergePaperMeta(meta, {
        year: typeof row.year === "number" ? row.year : undefined,
        session: row.session as PaperMeta["session"],
        paper: row.paper as string,
      });
      const draft: PastPaperQuestionDraft = {
        ...(row as PastPaperQuestionDraft),
        subject: meta.subject,
        year: rowMeta.year,
        session: rowMeta.session,
        paper: rowMeta.paper,
        calculatorType: (row.calculatorType as string) || rowMeta.calculatorType,
      };
      const normalized = normalizePastPaperQuestion(draft, {
        ownerId: params.user.id,
        ownerType: params.user.role === "instructor" ? "instructor" : "admin",
        accessPolicy: "private",
        aiGenerated: true,
        aiModel: pastPaperModel(),
        qpFileId: qpSafe,
        msFileId: msSafe,
        subject: subjectFields.subjectName,
        subjectCode: subjectFields.subjectCode || meta.subjectCode,
        subjectId: subjectFields.subjectId,
        grade: subjectFields.grade,
        topics,
      });
      if (!normalized) return null;

      const qid =
        resolveDisplayQid({
          qid: normalized.qid,
          subjectCode: subjectFields.subjectCode || meta.subjectCode,
          session: normalized.session,
          year: normalized.year,
          variant: rowMeta.variant,
          paperCode: rowMeta.paperCode || resolvedPaperCode,
          paper: normalized.paper,
          questionNumber: normalized.questionNumber,
        }) ||
        buildPastPaperQid({
          subjectCode: subjectFields.subjectCode || meta.subjectCode,
          session: normalized.session,
          year: normalized.year,
          variant: rowMeta.variant,
          paperCode: rowMeta.paperCode || resolvedPaperCode,
          paper: normalized.paper,
          questionNumber: normalized.questionNumber,
        });

      return qid ? { ...normalized, qid } : normalized;
    })
    .filter((q): q is NormalizedPastPaperQuestion => q !== null);

  return {
    questions,
    meta,
    qpUrl: pdfPublicUrl(qpSafe),
    msUrl: pdfPublicUrl(msSafe),
  };
}

/**
 * Persist a batch of (possibly admin-edited) past-paper questions into the
 * PlatformQuestion bank. Existing `qid`s are skipped so re-saving is safe.
 */
export async function savePastPaperQuestions(
  user: SessionUser,
  drafts: PastPaperQuestionDraft[],
  opts?: {
    qpFileId?: string;
    msFileId?: string;
    accessPolicy?: string;
  },
) {
  const ownerType = user.role === "instructor" ? "instructor" : "admin";
  const accessPolicy = user.role === "instructor" ? "private" : opts?.accessPolicy;

  const normalized = drafts
    .map((d) =>
      normalizePastPaperQuestion(d, {
        ownerId: user.id,
        ownerType,
        accessPolicy,
        aiGenerated: true,
        aiModel: pastPaperModel(),
        qpFileId: opts?.qpFileId || (d as { qpFileId?: string }).qpFileId,
        msFileId: opts?.msFileId || (d as { msFileId?: string }).msFileId,
      }),
    )
    .filter((q): q is NormalizedPastPaperQuestion => q !== null)
    .map((q) => ({
      ...q,
      qid:
        resolveDisplayQid({
          qid: q.qid,
          subjectCode: q.subjectCode,
          session: q.session,
          year: q.year,
          paper: q.paper,
          questionNumber: q.questionNumber,
        }) ||
        q.qid ||
        buildPastPaperQid({
          subjectCode: q.subjectCode,
          session: q.session,
          year: q.year,
          paper: q.paper,
          questionNumber: q.questionNumber,
        }),
    }));

  const qids = normalized
    .map((q) => q.qid)
    .filter((id): id is string => Boolean(id));

  const existing = qids.length
    ? new Set(
        (
          await PlatformQuestion.find({ qid: { $in: qids } })
            .select("qid")
            .lean()
        ).map((r) => String((r as { qid: string }).qid)),
      )
    : new Set<string>();

  const toInsert = normalized.filter((q) => !q.qid || !existing.has(q.qid));
  const skipped = normalized.length - toInsert.length;

  if (!toInsert.length) {
    return { saved: [], count: 0, skipped };
  }

  const created = await PlatformQuestion.insertMany(toInsert);
  return {
    saved: created.map((doc) =>
      serializePlatformQuestion(doc.toObject() as Record<string, unknown>),
    ),
    count: created.length,
    skipped,
  };
}
