import { describe, expect, it } from "vitest";
import {
  buildPastPaperQid,
  formatPastPaperLabel,
  parseCambridgePaperCode,
  parsePaperFilename,
} from "@/lib/pastPaperCode";

describe("parsePaperFilename", () => {
  it("parses Cambridge QP/MS filenames", () => {
    expect(parsePaperFilename("0606_s24_qp_21.pdf")).toBe("0606_s24_21");
    expect(parsePaperFilename("0606_s24_ms_21.pdf")).toBe("0606_s24_21");
    expect(parsePaperFilename("0606_m19_qp_12.pdf")).toBe("0606_m19_12");
  });
});

describe("parseCambridgePaperCode", () => {
  it("parses compact paper codes", () => {
    const meta = parseCambridgePaperCode("0606_s24_21");
    expect(meta).toMatchObject({
      subjectCode: "0606",
      session: "MJ",
      year: 2024,
      variant: "21",
      paper: "P2",
      paperCode: "0606_s24_21",
    });
  });

  it("parses freeform admin input", () => {
    const meta = parseCambridgePaperCode("MJ 2024 PP2");
    expect(meta.session).toBe("MJ");
    expect(meta.year).toBe(2024);
    expect(meta.paper).toBe("P2");
  });
});

describe("buildPastPaperQid", () => {
  it("matches XLSX QID format", () => {
    expect(
      buildPastPaperQid({
        paperCode: "0606_s24_21",
        questionNumber: "1a",
      }),
    ).toBe("0606_s24_21_Q1a");

    expect(
      buildPastPaperQid({
        paperCode: "0606_m19_12",
        questionNumber: "1(a)(i)",
      }),
    ).toBe("0606_m19_12_Q1ai");
  });
});

describe("formatPastPaperLabel", () => {
  it("formats admin label with question number", () => {
    expect(
      formatPastPaperLabel({
        session: "MJ",
        year: 2024,
        paper: "P2",
        questionNumber: "1a",
      }),
    ).toBe("MJ 2024 PP2/1a");
  });
});
