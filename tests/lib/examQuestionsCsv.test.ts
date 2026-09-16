import { describe, expect, it } from "vitest";
import {
  buildExamQuestionsTemplateCsv,
  parseCsvLine,
  parseExamQuestionsCsv,
  questionTypeAllowedForExam,
  splitCsvRows,
  sumQuestionMarks,
} from "@/lib/examQuestionsCsv";

describe("splitCsvRows / parseCsvLine", () => {
  it("handles quoted commas and newlines", () => {
    const text = `question,type,marks\n"Hello, world",mcq,1\n"Line1\nLine2",written,2`;
    const rows = splitCsvRows(text);
    expect(rows).toHaveLength(3);
    expect(parseCsvLine(rows[1])).toEqual(["Hello, world", "mcq", "1"]);
    expect(parseCsvLine(rows[2])[0]).toContain("Line1");
  });

  it("handles escaped double quotes", () => {
    expect(parseCsvLine('"Say ""hi""",mcq,1')).toEqual(['Say "hi"', "mcq", "1"]);
  });
});

describe("parseExamQuestionsCsv", () => {
  it("parses the minimal MCQ / written / true_false template", () => {
    const parsed = parseExamQuestionsCsv(buildExamQuestionsTemplateCsv());
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions).toHaveLength(3);
    expect(parsed.questions[0]).toMatchObject({
      type: "mcq",
      marks: 1,
      difficulty: "medium",
    });
    expect(parsed.questions[0].options?.some((o) => o.isCorrect && o.text === "4")).toBe(true);
    expect(parsed.questions[1].type).toBe("written");
    expect(parsed.questions[1].correctAnswer).toContain("sunlight");
    expect(parsed.questions[2].options).toEqual([
      { text: "True", isCorrect: true },
      { text: "False", isCorrect: false },
    ]);
  });

  it("blocks import when a row is invalid", () => {
    const csv = [
      "question,type,marks,answer,option_a,option_b",
      '"What is 2+2?",mcq,1,A,4,3',
      '"Broken mcq",mcq,1,,,',
    ].join("\n");
    const parsed = parseExamQuestionsCsv(csv);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.errors.length).toBe(1);
    expect(parsed.errors[0]).toMatch(/Row 3/);
  });

  it("accepts letter or text MCQ answers", () => {
    const csv = [
      "question,type,marks,answer,option_a,option_b,option_c,option_d",
      '"Pick the blue option",mcq,2,B,red,blue,green,yellow',
      '"Pick green by text",mcq,2,green,red,blue,green,yellow',
    ].join("\n");
    const parsed = parseExamQuestionsCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions[0].options?.[1].isCorrect).toBe(true);
    expect(parsed.questions[1].options?.[2].isCorrect).toBe(true);
  });

  it("prefills written type for an exam CSV without a type column", () => {
    const csv = [
      "question,marks,answer",
      '"Explain gravity.",4,"Objects attract each other."',
    ].join("\n");
    const parsed = parseExamQuestionsCsv(csv, { defaultType: "written" });
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions[0]).toMatchObject({
      type: "written",
      marks: 4,
      correctAnswer: "Objects attract each other.",
    });
  });

  it("prefills MCQ type for an exam CSV without a type column", () => {
    const csv = [
      "question,marks,answer,option_a,option_b",
      '"Choose two.",1,A,2,3',
    ].join("\n");
    const parsed = parseExamQuestionsCsv(csv, { defaultType: "mcq" });
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions[0].type).toBe("mcq");
    expect(parsed.questions[0].options?.[0].isCorrect).toBe(true);
  });
});

describe("questionTypeAllowedForExam", () => {
  it("restricts by exam type", () => {
    expect(questionTypeAllowedForExam("mcq", "mcq")).toBe(true);
    expect(questionTypeAllowedForExam("mcq", "true_false")).toBe(false);
    expect(questionTypeAllowedForExam("mcq", "written")).toBe(false);
    expect(questionTypeAllowedForExam("written", "written")).toBe(true);
    expect(questionTypeAllowedForExam("written", "essay")).toBe(false);
    expect(questionTypeAllowedForExam("written", "mcq")).toBe(false);
    expect(questionTypeAllowedForExam("mixed", "fill_blank")).toBe(true);
  });
});

describe("sumQuestionMarks", () => {
  it("sums marks", () => {
    expect(sumQuestionMarks([{ marks: 2 }, { marks: 3 }, {}])).toBe(5);
  });
});
