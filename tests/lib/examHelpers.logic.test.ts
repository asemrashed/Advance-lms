import { describe, expect, it } from "vitest";
import { validateExamDateOrder } from "@/lib/examValidation";
import { questionTypeAllowedForExam, sumQuestionMarks } from "@/lib/examQuestionsCsv";

describe("validateExamDateOrder", () => {
  it("allows missing dates", () => {
    expect(validateExamDateOrder(undefined, undefined)).toBeNull();
    expect(validateExamDateOrder("2026-01-01", undefined)).toBeNull();
  });

  it("rejects end before start", () => {
    expect(validateExamDateOrder("2026-06-01T10:00:00Z", "2026-05-01T10:00:00Z")).toMatch(
      /after start/,
    );
  });

  it("accepts valid range", () => {
    expect(validateExamDateOrder("2026-05-01T10:00:00Z", "2026-06-01T10:00:00Z")).toBeNull();
  });
});

describe("publish readiness helpers", () => {
  it("empty exam has zero marks", () => {
    expect(sumQuestionMarks([])).toBe(0);
  });

  it("mcq exam rejects written questions", () => {
    expect(questionTypeAllowedForExam("mcq", "written")).toBe(false);
  });
});
