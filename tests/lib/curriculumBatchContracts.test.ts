import { describe, expect, it } from "vitest";
import {
  parseBatchDate,
  parseFee,
  parseMaxStudents,
} from "@/app/api/_lib/batchFieldValidation";
import { normalizeBatchGrade } from "@/lib/batchGrades";
import { validateLessonCreateInput } from "@/app/api/_lib/unifiedCourse";
import { normalizeLessonType } from "@/lib/courses/unifiedCourse";

describe("batchFieldValidation", () => {
  it("parses valid dates and rejects invalid ones", () => {
    expect(parseBatchDate("2026-01-01")).toBeInstanceOf(Date);
    expect(parseBatchDate("not-a-date")).toBeNull();
    expect(parseBatchDate("")).toBeNull();
  });

  it("requires positive integer capacity", () => {
    expect(parseMaxStudents(30)).toBe(30);
    expect(parseMaxStudents(0)).toBeNull();
    expect(parseMaxStudents(1.5)).toBeNull();
    expect(parseMaxStudents("abc")).toBeNull();
  });

  it("requires nonnegative finite fees", () => {
    expect(parseFee(0)).toBe(0);
    expect(parseFee(1200)).toBe(1200);
    expect(parseFee(-1)).toBeNull();
    expect(parseFee(Number.NaN)).toBeNull();
  });
});

describe("batch grade inheritance", () => {
  it("normalizes parent course grade tokens", () => {
    expect(normalizeBatchGrade("O")).toBe("O");
    expect(normalizeBatchGrade("A")).toBe("A");
    expect(normalizeBatchGrade("PRE_O")).toBe("PRE_O");
    expect(normalizeBatchGrade("10")).toBe("PRE_O");
    expect(normalizeBatchGrade("Additional Mathematics")).toBe("O");
  });
});

describe("lesson update contract helpers", () => {
  it("allows live lessons on live courses without batch", () => {
    expect(
      validateLessonCreateInput({
        courseType: "live",
        lessonType: normalizeLessonType("live"),
      }),
    ).toBeNull();
  });

  it("rejects live lessons on recorded courses", () => {
    expect(
      validateLessonCreateInput({
        courseType: "recorded",
        lessonType: normalizeLessonType("live"),
      }),
    ).toMatch(/live lesson type/i);
  });

  it("rejects recorded-course batch scoping", () => {
    expect(
      validateLessonCreateInput({
        courseType: "recorded",
        lessonType: normalizeLessonType("recorded"),
        batchId: "507f1f77bcf86cd799439011",
      }),
    ).toMatch(/cannot scope lessons to a batch/i);
  });
});
