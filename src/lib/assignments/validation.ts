export const ASSIGNMENT_PDF_EXTENSIONS = [".pdf"] as const;
export const ASSIGNMENT_PDF_MIME = "application/pdf";

export type AssignmentTypeValue =
  | "pdf"
  | "mcq"
  | "essay"
  | "file_upload"
  | "quiz"
  | "project"
  | "presentation";

export const PRIMARY_ASSIGNMENT_TYPES = ["pdf", "mcq"] as const;

export interface McqQuestionInput {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

export interface SubmissionFileInput {
  name: string;
  url?: string;
  type?: string;
  size?: number;
}

export function isPdfSubmissionFile(file: SubmissionFileInput): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "pdf" || String(file.type || "").toLowerCase() === ASSIGNMENT_PDF_MIME;
}

export function normalizeMcqQuestions(raw: unknown): McqQuestionInput[] {
  if (!Array.isArray(raw)) return [];
  const out: McqQuestionInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id || "").trim() || `q-${out.length + 1}`;
    const question = String(row.question || "").trim();
    const options = Array.isArray(row.options)
      ? row.options.map((o) => String(o).trim()).filter(Boolean)
      : [];
    const correctOptionIndex = Number(row.correctOptionIndex);
    const marks = Number(row.marks);
    if (!question || options.length < 2) continue;
    if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      continue;
    }
    if (!Number.isFinite(marks) || marks <= 0) continue;
    out.push({ id, question, options, correctOptionIndex, marks });
  }
  return out;
}

export function scoreMcqSubmission(
  questions: McqQuestionInput[],
  answers: Array<{ questionId?: string; answer?: string | string[] }>,
): { score: number; maxScore: number; gradedAnswers: Array<{ questionId: string; answer: string; isCorrect: boolean }> } {
  const answerMap = new Map<string, string>();
  for (const ans of answers) {
    const qid = String(ans.questionId || "").trim();
    if (!qid) continue;
    const value = Array.isArray(ans.answer) ? String(ans.answer[0] ?? "") : String(ans.answer ?? "");
    answerMap.set(qid, value);
  }

  let score = 0;
  let maxScore = 0;
  const gradedAnswers: Array<{ questionId: string; answer: string; isCorrect: boolean }> = [];

  for (const q of questions) {
    maxScore += q.marks;
    const selected = answerMap.get(q.id) ?? "";
    const isCorrect = selected === String(q.correctOptionIndex);
    if (isCorrect) score += q.marks;
    gradedAnswers.push({ questionId: q.id, answer: selected, isCorrect });
  }

  return { score, maxScore, gradedAnswers };
}

export function defaultAllowedFileTypesForType(type: string): string[] {
  if (type === "pdf" || type === "file_upload") return [...ASSIGNMENT_PDF_EXTENSIONS];
  return [];
}
