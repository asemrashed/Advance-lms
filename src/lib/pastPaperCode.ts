/**
 * Cambridge past-paper code parsing + display labels.
 *
 * Matches the client's Python pipeline and XLSX format:
 * - Filename: 0606_s24_qp_21.pdf → paper code 0606_s24_21
 * - QID: 0606_s24_21_Q1a
 * - Admin label: MJ 2024 PP2/1a
 */
import { parseSession } from "./pastPaperTopics";

export interface PaperMeta {
  subjectCode?: string;
  subject?: string;
  year?: number;
  session?: "FM" | "MJ" | "ON";
  /** Stored as P1 / P2 (matches XLSX Paper column). */
  paper?: string;
  /** Cambridge variant digits, e.g. 21, 12. */
  variant?: string;
  calculatorType?: string;
  /** Compact code, e.g. 0606_s24_21. */
  paperCode?: string;
}

const SESSION_LETTER: Record<"FM" | "MJ" | "ON", string> = {
  FM: "m",
  MJ: "s",
  ON: "w",
};

const LETTER_SESSION: Record<string, "FM" | "MJ" | "ON"> = {
  m: "FM",
  s: "MJ",
  w: "ON",
};

/** Extract compact paper code from a QP/MS PDF filename. */
export function parsePaperFilename(filename: string): string | undefined {
  const base = filename.replace(/\.pdf$/i, "").trim();
  const paired = base.match(/^(\d{4})_([msw]\d{2})_(?:qp|ms)_(\d{2})$/i);
  if (paired) {
    return `${paired[1]}_${paired[2].toLowerCase()}_${paired[3]}`;
  }
  if (/^\d{4}_[msw]\d{2}_\d{2}$/i.test(base)) {
    return base.toLowerCase();
  }
  return undefined;
}

/** Derive P1/P2 from Cambridge variant (11→P1, 21→P2). */
export function paperFromVariant(variant: string): string | undefined {
  const v = variant.trim();
  if (!/^\d{2}$/.test(v)) return undefined;
  return `P${v[0]}`;
}

/** Normalize paper to P1 / P2 (XLSX format). */
export function normalizePaperValue(paper: unknown): string | undefined {
  const raw = String(paper ?? "").trim().toUpperCase();
  if (!raw) return undefined;
  if (/^P\d$/.test(raw)) return raw;
  const digit = raw.replace(/[^0-9]/g, "");
  if (digit.length === 1) return `P${digit}`;
  return undefined;
}

/** Admin display: P2 → PP2. */
export function displayPaperLabel(paper?: string): string {
  const norm = normalizePaperValue(paper);
  return norm ? `P${norm}` : "";
}

/** Format: MJ 2024 PP2/1a */
export function formatPastPaperLabel(input: {
  session?: string;
  year?: number | string;
  paper?: string;
  questionNumber?: string;
}): string | undefined {
  const session = input.session?.trim();
  const year = input.year != null && input.year !== "" ? String(input.year) : "";
  const paperLabel = displayPaperLabel(input.paper);
  const qNum = String(input.questionNumber ?? "").trim();

  const head = [session, year, paperLabel].filter(Boolean).join(" ");
  if (!head) return undefined;
  return qNum ? `${head}/${qNum}` : head;
}

/** Compact question ref for QID suffix (1(a)(i) → 1ai). */
export function compactQuestionForQid(questionNumber: string): string {
  return questionNumber.replace(/[().\s]/g, "").toLowerCase();
}

/** Parse compact or freeform paper codes. */
export function parseCambridgePaperCode(raw: string): PaperMeta {
  const meta: PaperMeta = {};
  const code = raw.trim();
  if (!code) return meta;

  const compact = code.match(/^(\d{4})_([msw])(\d{2})_(\d{2})$/i);
  if (compact) {
    meta.subjectCode = compact[1];
    meta.session = LETTER_SESSION[compact[2].toLowerCase()];
    meta.year = 2000 + Number.parseInt(compact[3], 10);
    meta.variant = compact[4];
    meta.paper = paperFromVariant(compact[4]);
    meta.paperCode = `${compact[1]}_${compact[2].toLowerCase()}${compact[3]}_${compact[4]}`;
    return meta;
  }

  const fromFile = parsePaperFilename(`${code}.pdf`);
  if (fromFile && fromFile !== code.toLowerCase()) {
    return parseCambridgePaperCode(fromFile);
  }

  const yearMatch = code.match(/\b(20\d{2}|\d{2})\b/);
  if (yearMatch) {
    const y = Number.parseInt(yearMatch[1], 10);
    meta.year = y < 100 ? 2000 + y : y;
  }

  const sessionMatch = code.match(/\b(FM|MJ|ON)\b/i);
  if (sessionMatch) {
    meta.session = sessionMatch[1].toUpperCase() as PaperMeta["session"];
  } else {
    const session = parseSession(code);
    if (session) meta.session = session;
  }

  const paperMatch = code.match(/\bPP?(\d)\b/i);
  if (paperMatch) meta.paper = `P${paperMatch[1]}`;

  const syllabus = code.match(/\b(0\d{3})\b/);
  if (syllabus) meta.subjectCode = syllabus[1];

  return meta;
}

/** Later sources override earlier ones (filename > manual paper code > AI row). */
export function mergePaperMeta(...sources: (PaperMeta | undefined)[]): PaperMeta {
  const result: PaperMeta = {};
  for (const src of sources) {
    if (!src) continue;
    if (src.subjectCode) result.subjectCode = src.subjectCode;
    if (src.subject) result.subject = src.subject;
    if (src.year != null) result.year = src.year;
    if (src.session) result.session = src.session;
    if (src.paper) result.paper = normalizePaperValue(src.paper);
    if (src.variant) result.variant = src.variant;
    if (src.calculatorType) result.calculatorType = src.calculatorType;
    if (src.paperCode) result.paperCode = src.paperCode;
  }
  return result;
}

/** Build QID like 0606_s24_21_Q1a (client / XLSX format). */
export function buildPastPaperQid(q: {
  subjectCode?: string;
  session?: string;
  year?: number;
  variant?: string;
  paperCode?: string;
  paper?: string;
  questionNumber?: string;
}): string | undefined {
  const qNum = String(q.questionNumber ?? "").trim();
  if (!qNum) return undefined;

  let prefix = q.paperCode?.trim().toLowerCase();
  if (!prefix && q.subjectCode && q.session && q.year != null) {
    const letter = SESSION_LETTER[q.session as keyof typeof SESSION_LETTER];
    if (letter) {
      const yr = String(q.year).slice(-2);
      const paperDigit = normalizePaperValue(q.paper)?.replace("P", "");
      const variant = q.variant || (paperDigit ? `${paperDigit}1` : undefined);
      if (variant) prefix = `${q.subjectCode}_${letter}${yr}_${variant}`;
    }
  }
  if (!prefix) return undefined;

  return `${prefix}_Q${compactQuestionForQid(qNum)}`;
}

/**
 * Prefer stored `qid` when it already looks like a Cambridge compact id
 * (e.g. 0606_m19_12_Q1ai). Otherwise rebuild from paper metadata.
 */
export function resolveDisplayQid(q: {
  qid?: string;
  subjectCode?: string;
  session?: string;
  year?: number | string;
  variant?: string;
  paperCode?: string;
  paper?: string;
  questionNumber?: string;
}): string | undefined {
  const stored = String(q.qid ?? "").trim();
  if (/^\d{4}_[msw]\d{2}_\d{2}_Q/i.test(stored)) {
    return stored;
  }

  const year =
    q.year != null && q.year !== ""
      ? typeof q.year === "number"
        ? q.year
        : Number.parseInt(String(q.year), 10)
      : undefined;

  return (
    buildPastPaperQid({
      subjectCode: q.subjectCode,
      session: q.session,
      year: Number.isFinite(year) ? year : undefined,
      variant: q.variant,
      paperCode: q.paperCode,
      paper: q.paper,
      questionNumber: q.questionNumber,
    }) || (stored || undefined)
  );
}

/** @deprecated Use parseCambridgePaperCode — kept for existing imports. */
export function parsePaperCode(raw: string): PaperMeta {
  return parseCambridgePaperCode(raw);
}
