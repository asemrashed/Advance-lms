/**
 * Parse Platform QB past-paper sheets in the client's master format
 * (0606_QuestionDatabase_MASTER.xlsx / Google Sheets / CSV).
 *
 * Expected columns (aliases accepted):
 *   QID, Subject, Year, Session, Paper, Question_Number, Question_Text,
 *   Marks, Topic_ID, Topic_Name, Subtopic, Difficulty, Calculator_Type,
 *   Has_Diagram, Diagram_Status, Has_MS_Diagram, MS_Diagram_Status,
 *   MS_Text, AI_Confidence, Tag_Verified, Status, Notes
 */
import * as XLSX from "xlsx";
import type { PastPaperQuestionDraft } from "./pastPaperQuestion";
export {
  MASTER_SHEET_HEADERS,
  buildMasterTemplateCsv,
} from "./pastPaperSheetHeaders";

/**
 * Map a sheet header to a draft field. Headers are lower-cased and stripped of
 * non-alphanumerics before lookup, so "Question Text", "question_text" and
 * "questionText" all resolve to the same key.
 */
export const HEADER_ALIASES: Record<string, keyof PastPaperQuestionDraft | "tagVerified" | "isActive"> = {
  qid: "qid",
  id: "qid",
  questionid: "qid",
  subject: "subject",
  topic: "topic",
  topicname: "topic",
  topicnumber: "topicNumber",
  topicno: "topicNumber",
  topicnum: "topicNumber",
  topicid: "topicNumber",
  t: "topicNumber",
  subtopic: "subtopic",
  difficulty: "difficulty",
  difficultylevel: "difficulty",
  level: "difficulty",
  questiontext: "questionText",
  question: "questionText",
  answer: "answerText",
  answertext: "answerText",
  markscheme: "msText",
  ms: "msText",
  mstext: "msText",
  msanswer: "msText",
  explanation: "explanation",
  marks: "marks",
  mark: "marks",
  year: "year",
  session: "session",
  series: "session",
  paper: "paper",
  papercode: "paper",
  variant: "paper",
  questionnumber: "questionNumber",
  qno: "questionNumber",
  questionno: "questionNumber",
  calculatortype: "calculatorType",
  calculator: "calculatorType",
  calc: "calculatorType",
  hasdiagram: "hasDiagram",
  diagram: "hasDiagram",
  qpdiagram: "hasDiagram",
  diagramurl: "diagramUrl",
  hasmsdiagram: "hasMsDiagram",
  msdiagram: "hasMsDiagram",
  msdiagramurl: "msDiagramUrl",
  confidence: "aiTagConfidence",
  aiconfidence: "aiTagConfidence",
  aitagconfidence: "aiTagConfidence",
  tagconfidence: "aiTagConfidence",
  notes: "notes",
  note: "notes",
  tags: "tags",
  tagverified: "tagVerified",
  verified: "tagVerified",
  status: "isActive",
  isactive: "isActive",
  active: "isActive",
};

export type SheetRowDraft = PastPaperQuestionDraft & {
  tagVerified?: boolean | string;
  isActive?: boolean | string;
};

export function normalizeHeader(
  header: string,
): keyof SheetRowDraft | null {
  const key = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (HEADER_ALIASES[key] as keyof SheetRowDraft | undefined) ?? null;
}

function parseYesNoFlag(value: unknown): boolean | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "1", "active"].includes(raw)) return true;
  if (["no", "n", "false", "0", "inactive", "disabled"].includes(raw)) return false;
  return undefined;
}

export function rowToDraft(row: Record<string, unknown>): SheetRowDraft {
  const draft: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(row)) {
    const field = normalizeHeader(header);
    if (!field || value === "" || value == null) continue;
    if (field === "tagVerified" || field === "isActive") {
      const parsed = parseYesNoFlag(value);
      if (parsed !== undefined) draft[field] = parsed;
      continue;
    }
    draft[field] = value;
  }
  return draft as SheetRowDraft;
}

export function detectSheetFormat(filenameOrUrl: string): "xlsx" | "csv" | "unknown" {
  const lower = filenameOrUrl.toLowerCase().split("?")[0];
  if (lower.endsWith(".csv") || lower.includes("format=csv")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.includes("format=xlsx")) {
    return "xlsx";
  }
  return "unknown";
}

/**
 * Convert a Google Sheets share/edit URL into an export URL.
 * Sheet must be visible to "Anyone with the link" (or published).
 */
export function googleSheetToExportUrl(
  input: string,
  format: "xlsx" | "csv" = "xlsx",
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Already an export URL
  if (/docs\.google\.com\/spreadsheets\/d\/[^/]+\/export/i.test(trimmed)) {
    return trimmed;
  }

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const id = idMatch[1];

  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch?.[1];

  const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=${format}`;
  return gid ? `${base}&gid=${gid}` : base;
}

export interface ParsedSheetResult {
  sheetName: string;
  sheetNames: string[];
  rows: SheetRowDraft[];
  rawRowCount: number;
}

export function parseWorkbookBuffer(
  buffer: ArrayBuffer | Buffer,
  opts?: { sheetName?: string; filename?: string },
): ParsedSheetResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames.length) {
    throw new Error("Workbook has no sheets");
  }

  const sheetName = opts?.sheetName || sheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(
      `Sheet "${sheetName}" not found. Available: ${sheetNames.join(", ")}`,
    );
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return {
    sheetName,
    sheetNames,
    rawRowCount: rawRows.length,
    rows: rawRows.map(rowToDraft),
  };
}

