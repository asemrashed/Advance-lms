/**
 * Shared past-paper question normalizer.
 *
 * Turns a loosely-typed draft (from the CSV/XLSX importer OR the Claude
 * vision extractor) into a clean `PlatformQuestion` document body. Pure and
 * dependency-free so it can be imported both from API routes and from the
 * `scripts/*` tsx importer.
 */
import { normalizePaperValue } from "./pastPaperCode";
import {
  confidenceToNumber,
  derivePastPaperStatus,
  difficultyToNumber,
  parseSession,
  parseTopicNumber,
  topicName,
  yesNoToBoolean,
} from "./pastPaperTopics";
import {
  parseTopicNumberFromList,
  topicNameFromList,
  type TopicRef,
} from "./subjectChapters";

export const PAST_PAPER_SOURCE_TYPE = "pastpaper" as const;

/** Loose input shape — every field optional so partial rows still normalize. */
export interface PastPaperQuestionDraft {
  qid?: string;
  subject?: string;
  topic?: string;
  topicNumber?: string | number;
  subtopic?: string;
  difficulty?: string | number;
  questionText?: string;
  answerText?: string;
  msText?: string;
  explanation?: string;
  marks?: string | number;
  year?: string | number;
  session?: string;
  paper?: string;
  questionNumber?: string;
  calculatorType?: string;
  hasDiagram?: string | number | boolean;
  diagramUrl?: string;
  hasMsDiagram?: string | number | boolean;
  msDiagramUrl?: string;
  aiTagConfidence?: string | number;
  notes?: string;
  tags?: string[] | string;
  /** From sheet Tag_Verified column (Yes/No). */
  tagVerified?: boolean | string;
  /** From sheet Status column (Active/Inactive). */
  isActive?: boolean | string;
}

export interface BuildPastPaperOptions {
  ownerId: unknown;
  ownerType?: "admin" | "instructor";
  accessPolicy?: string;
  aiGenerated?: boolean;
  aiModel?: string;
  qpFileId?: string;
  msFileId?: string;
  subject?: string;
  subjectCode?: string;
  subjectId?: string;
  grade?: string;
}

export interface NormalizedPastPaperQuestion {
  qid?: string;
  subject: string;
  subjectId?: unknown;
  subjectCode?: string;
  grade?: string;
  topic: string;
  topicNumber?: number;
  subtopic?: string;
  difficulty: 1 | 2 | 3;
  questionFormat: "written";
  questionText: string;
  options: never[];
  answerText?: string;
  msText?: string;
  explanation?: string;
  marks?: number;
  year?: number;
  session?: "FM" | "MJ" | "ON";
  paper?: string;
  questionNumber?: string;
  calculatorType?: string;
  hasDiagram: boolean;
  diagramUrl?: string;
  diagramStatus: "none" | "missing" | "uploaded";
  hasMsDiagram: boolean;
  msDiagramUrl?: string;
  msDiagramStatus: "none" | "missing" | "uploaded";
  status: "complete" | "incomplete";
  notes?: string;
  tags: string[];
  ownerType: "admin" | "instructor";
  ownerId: unknown;
  accessPolicy: "private" | "shared_with_instructors" | "public";
  aiGenerated: boolean;
  aiModel?: string;
  aiTagConfidence?: number;
  tagVerified: boolean;
  sourceType: typeof PAST_PAPER_SOURCE_TYPE;
  qpFileId?: string;
  msFileId?: string;
  isActive: boolean;
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function optionalStr(value: unknown): string | undefined {
  const s = str(value);
  return s || undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number.parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Diagram lifecycle: if the question flags a diagram but no image URL is set
 * yet, it is "missing" (awaits a manual PNG crop); once a URL exists it is
 * "uploaded"; otherwise "none".
 */
function diagramStatusFor(hasDiagram: boolean, url?: string): "none" | "missing" | "uploaded" {
  if (!hasDiagram) return "none";
  return url ? "uploaded" : "missing";
}

function normalizeAccessPolicy(
  value: unknown,
): "private" | "shared_with_instructors" | "public" {
  const p = str(value);
  return p === "shared_with_instructors" || p === "public" ? p : "private";
}

export function normalizePastPaperQuestion(
  draft: PastPaperQuestionDraft,
  opts: BuildPastPaperOptions & {
    /** When set, topic numbers/names must match this subject chapter list. */
    topics?: TopicRef[];
  },
): NormalizedPastPaperQuestion | null {
  const questionText = str(draft.questionText);
  if (!questionText) return null;

  const topicList = opts.topics;
  let topicNumber: number | undefined;
  let topic: string;

  if (topicList?.length) {
    topicNumber = parseTopicNumberFromList(draft.topicNumber ?? draft.topic, topicList);
    topic =
      optionalStr(draft.topic) ||
      topicNameFromList(topicNumber, topicList) ||
      topicList[0]?.name ||
      "Uncategorized";
    if (topicNumber == null) {
      const byName = topicList.find(
        (t) => t.name.toLowerCase() === topic.toLowerCase(),
      );
      topicNumber = byName?.number;
      if (byName) topic = byName.name;
    }
  } else {
    topicNumber = parseTopicNumber(draft.topicNumber ?? draft.topic);
    topic = optionalStr(draft.topic) || topicName(topicNumber) || "Uncategorized";
  }
  const subject =
    optionalStr(opts.subject) ||
    optionalStr(draft.subject) ||
    optionalStr(opts.subjectCode) ||
    "Uncategorized";
  const subjectCode = optionalStr(opts.subjectCode) || optionalStr((draft as { subjectCode?: string }).subjectCode);
  const grade = optionalStr(opts.grade) || optionalStr((draft as { grade?: string }).grade);

  const hasDiagram = yesNoToBoolean(draft.hasDiagram);
  const diagramUrl = optionalStr(draft.diagramUrl);
  const hasMsDiagram = yesNoToBoolean(draft.hasMsDiagram);
  const msDiagramUrl = optionalStr(draft.msDiagramUrl);

  const diagramStatus = diagramStatusFor(hasDiagram, diagramUrl);
  const msDiagramStatus = diagramStatusFor(hasMsDiagram, msDiagramUrl);
  const status = derivePastPaperStatus({
    diagramStatus,
    hasMsDiagram,
    msDiagramStatus,
  });

  const tags = Array.isArray(draft.tags)
    ? draft.tags.map((t) => str(t)).filter(Boolean)
    : str(draft.tags)
        .split(/[;,]/)
        .map((t) => t.trim())
        .filter(Boolean);

  const tagVerified =
    draft.tagVerified == null || draft.tagVerified === ""
      ? false
      : yesNoToBoolean(draft.tagVerified);
  const isActive =
    draft.isActive == null || draft.isActive === ""
      ? true
      : yesNoToBoolean(draft.isActive);

  return {
    qid: optionalStr(draft.qid),
    subject,
    subjectId: opts.subjectId,
    subjectCode,
    grade,
    topic,
    topicNumber,
    subtopic: optionalStr(draft.subtopic),
    difficulty: difficultyToNumber(draft.difficulty),
    questionFormat: "written",
    questionText,
    options: [],
    answerText: optionalStr(draft.answerText) || optionalStr(draft.msText),
    msText: optionalStr(draft.msText),
    explanation: optionalStr(draft.explanation),
    marks: optionalNumber(draft.marks),
    year: optionalNumber(draft.year),
    session: parseSession(draft.session),
    paper: normalizePaperValue(draft.paper) || optionalStr(draft.paper),
    questionNumber: optionalStr(draft.questionNumber),
    calculatorType: optionalStr(draft.calculatorType),
    hasDiagram,
    diagramUrl,
    diagramStatus,
    hasMsDiagram,
    msDiagramUrl,
    msDiagramStatus,
    status,
    notes: optionalStr(draft.notes),
    tags,
    ownerType: opts.ownerType || "admin",
    ownerId: opts.ownerId,
    accessPolicy: normalizeAccessPolicy(opts.accessPolicy),
    aiGenerated: opts.aiGenerated ?? true,
    aiModel: opts.aiModel,
    aiTagConfidence: confidenceToNumber(draft.aiTagConfidence),
    tagVerified,
    sourceType: PAST_PAPER_SOURCE_TYPE,
    qpFileId: opts.qpFileId,
    msFileId: opts.msFileId,
    isActive,
  };
}
