/**
 * Minimal exam-question CSV format for instructor bulk import.
 *
 * Columns:
 *   question,type,marks,answer,option_a,option_b,option_c,option_d
 *
 * - Required: question, type, marks
 * - MCQ: option_a + option_b minimum; answer = A–D or exact option text
 * - true_false: answer = true|false (options auto-filled)
 * - written/fill_blank/essay: answer = correctAnswer text
 */

export type ExamCsvQuestionType =
  | "mcq"
  | "written"
  | "true_false"
  | "fill_blank"
  | "essay";

export type ExamCsvParsedQuestion = {
  question: string;
  type: ExamCsvQuestionType;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  options?: { text: string; isCorrect: boolean }[];
  correctAnswer?: string;
};

export type ExamCsvRowResult =
  | { ok: true; row: number; question: ExamCsvParsedQuestion }
  | { ok: false; row: number; error: string };

export type ExamCsvParseResult = {
  results: ExamCsvRowResult[];
  questions: ExamCsvParsedQuestion[];
  errors: string[];
};

const BASE_REQUIRED_HEADERS = ["question", "marks"] as const;

const TYPE_ALIASES: Record<string, ExamCsvQuestionType> = {
  mcq: "mcq",
  "multiple choice": "mcq",
  multiple_choice: "mcq",
  written: "written",
  essay: "essay",
  true_false: "true_false",
  truefalse: "true_false",
  "true/false": "true_false",
  tf: "true_false",
  fill_blank: "fill_blank",
  fillblank: "fill_blank",
  "fill in the blank": "fill_blank",
  fill_in_the_blank: "fill_blank",
};

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Split CSV text into rows, respecting quoted newlines and escaped quotes. */
export function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      if (current.trim()) rows.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) rows.push(current);
  return rows;
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result;
}

function getCell(headers: string[], values: string[], ...names: string[]): string {
  for (const name of names) {
    const idx = headers.indexOf(name);
    if (idx >= 0 && values[idx] != null && String(values[idx]).trim() !== "") {
      return String(values[idx]).trim();
    }
  }
  return "";
}

function parseType(raw: string): ExamCsvQuestionType | null {
  const key = raw.trim().toLowerCase();
  return TYPE_ALIASES[key] ?? null;
}

function letterToIndex(answer: string): number | null {
  const letter = answer.trim().toUpperCase();
  if (/^[A-D]$/.test(letter)) return letter.charCodeAt(0) - 65;
  if (/^[1-4]$/.test(letter)) return Number(letter) - 1;
  return null;
}

export function parseExamQuestionRow(
  headers: string[],
  values: string[],
  defaultType?: ExamCsvQuestionType,
): ExamCsvParsedQuestion {
  const question = getCell(headers, values, "question", "question_text", "q");
  if (!question) throw new Error("Question text is required");
  if (question.length < 3) throw new Error("Question text is too short");

  const typeRaw = getCell(headers, values, "type", "question_type");
  const type = defaultType ?? parseType(typeRaw);
  if (!type) {
    throw new Error("Type must be mcq, written, true_false, fill_blank, or essay");
  }

  const marks = Number.parseFloat(getCell(headers, values, "marks", "mark"));
  if (!Number.isFinite(marks) || marks < 1 || marks > 100) {
    throw new Error("Marks must be a number between 1 and 100");
  }

  const difficultyRaw = getCell(headers, values, "difficulty").toLowerCase();
  const difficulty: ExamCsvParsedQuestion["difficulty"] =
    difficultyRaw === "easy" || difficultyRaw === "hard" ? difficultyRaw : "medium";

  const answer = getCell(headers, values, "answer", "correct", "correctanswer", "correct_answer");

  const questionData: ExamCsvParsedQuestion = {
    question,
    type,
    marks: Math.round(marks),
    difficulty,
  };

  if (type === "mcq") {
    const optionCells = [
      getCell(headers, values, "option_a", "optiona", "a"),
      getCell(headers, values, "option_b", "optionb", "b"),
      getCell(headers, values, "option_c", "optionc", "c"),
      getCell(headers, values, "option_d", "optiond", "d"),
    ].filter(Boolean);

    // Legacy pipe-separated options column
    const optionsRaw = getCell(headers, values, "options");
    const fromPipe = optionsRaw
      ? optionsRaw.split("|").map((t) => t.trim()).filter(Boolean)
      : [];
    const optionTexts = optionCells.length >= 2 ? optionCells : fromPipe;

    if (optionTexts.length < 2) {
      throw new Error("MCQ needs at least option_a and option_b (or options A|B|…)");
    }
    if (!answer) throw new Error("MCQ needs an answer (A–D or option text)");

    const byLetter = letterToIndex(answer);
    const options = optionTexts.map((text, index) => {
      const matchLetter = byLetter === index;
      const matchText = answer.toLowerCase() === text.toLowerCase();
      return { text, isCorrect: matchLetter || matchText };
    });

    if (!options.some((o) => o.isCorrect)) {
      throw new Error("MCQ answer did not match any option (use A–D or exact text)");
    }

    questionData.options = options;
  } else if (type === "true_false") {
    const normalized = answer.trim().toLowerCase();
    if (!["true", "false", "t", "f", "yes", "no", "1", "0"].includes(normalized)) {
      throw new Error("True/False answer must be true or false");
    }
    const isTrue = ["true", "t", "yes", "1"].includes(normalized);
    questionData.options = [
      { text: "True", isCorrect: isTrue },
      { text: "False", isCorrect: !isTrue },
    ];
  } else {
    if (!answer || answer.length < 1) {
      throw new Error(`${type} questions need an answer`);
    }
    questionData.correctAnswer = answer;
  }

  return questionData;
}

export function parseExamQuestionsCsv(
  text: string,
  options?: { defaultType?: ExamCsvQuestionType },
): ExamCsvParseResult {
  const lines = splitCsvRows(text);
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row");
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const requiredHeaders = options?.defaultType
    ? BASE_REQUIRED_HEADERS
    : [...BASE_REQUIRED_HEADERS, "type"];
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length) {
    throw new Error(`Missing required headers: ${missing.join(", ")}`);
  }

  const results: ExamCsvRowResult[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const rowNum = i + 1;
    if (values.every((v) => !v.trim())) continue;

    try {
      // Pad short rows so optional columns can be missing
      while (values.length < headers.length) values.push("");
      const question = parseExamQuestionRow(headers, values, options?.defaultType);
      results.push({ ok: true, row: rowNum, question });
    } catch (err) {
      results.push({
        ok: false,
        row: rowNum,
        error: err instanceof Error ? err.message : "Invalid row",
      });
    }
  }

  const questions = results.filter((r): r is Extract<ExamCsvRowResult, { ok: true }> => r.ok).map((r) => r.question);
  const errors = results
    .filter((r): r is Extract<ExamCsvRowResult, { ok: false }> => !r.ok)
    .map((r) => `Row ${r.row}: ${r.error}`);

  return { results, questions, errors };
}

export function buildExamQuestionsTemplateCsv(
  defaultType?: ExamCsvQuestionType,
): string {
  if (defaultType === "written") {
    return [
      "question,marks,answer",
      '"Explain photosynthesis.",5,"Plants convert sunlight into chemical energy"',
    ].join("\n");
  }
  if (defaultType === "mcq") {
    return [
      "question,marks,answer,option_a,option_b,option_c,option_d",
      '"What is 2 + 2?",1,A,4,3,5,2',
    ].join("\n");
  }
  return [
    "question,type,marks,answer,option_a,option_b,option_c,option_d",
    '"What is 2 + 2?",mcq,1,A,4,3,5,2',
    '"Explain photosynthesis.",written,5,"Plants convert sunlight into chemical energy",,,,',
    '"Water boils at 100°C at sea level.",true_false,1,true,,,,',
  ].join("\n");
}

/** Exam type → allowed question types. */
export function questionTypeAllowedForExam(
  examType: "mcq" | "written" | "mixed",
  questionType: ExamCsvQuestionType,
): boolean {
  if (examType === "mixed") return true;
  if (examType === "mcq") return questionType === "mcq";
  return questionType === "written";
}

export function sumQuestionMarks(questions: Array<{ marks?: number }>): number {
  return questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
}
