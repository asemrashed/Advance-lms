import { describe, expect, it } from "vitest";
import { renderContentToHtml, renderMixedTextToHtml } from "@/lib/math/renderMathHtml";
import {
  buildWorksheetPdfBuffer,
  contentToPlainText,
} from "@/lib/pdf/worksheetPdf";

describe("renderMixedTextToHtml", () => {
  it("renders nested exponents with KaTeX instead of caret text", () => {
    const html = renderMixedTextToHtml("f(x) = e^(x^2 + 3)");
    expect(html).toContain("katex");
    expect(html).not.toContain("e^(");
  });

  it("renders sqrt and slash fractions instead of ASCII", () => {
    const html = renderMixedTextToHtml(
      "Write (16 + 11*sqrt(10)) / (2 + sqrt(10)) + 1 in the form p + q*sqrt(10).",
    );
    expect(html).toContain("katex");
    expect(html).not.toContain("sqrt(");
    expect(html).toContain("Write");
    expect(html).toContain("in the form");
  });

  it("renders packed exponents and worded roots without KaTeX errors", () => {
    const packed = renderMixedTextToHtml(
      "(sqrt(pq^3r^-3))/(pq^-1)^(r-1) = p^a q^b r^c",
    );
    const roots = renderMixedTextToHtml(
      "cube root of xy(zy)^2 / (xz)^3 / fourth root of z = x^a y^b z^c",
    );
    expect(packed).toContain("katex");
    expect(roots).toContain("katex");
    expect(packed).not.toContain("katex-error");
    expect(roots).not.toContain("katex-error");
    expect(packed).not.toContain("math-fallback");
    expect(roots).not.toContain("math-fallback");
  });
});

describe("renderContentToHtml", () => {
  it("hydrates TipTap math nodes", () => {
    const html = renderContentToHtml(
      '<p>Find <span data-type="inline-math" data-latex="x^{2}"></span></p>',
    );
    expect(html).toContain("katex");
    expect(html).toContain("Find");
  });

  it("merges repeated Questions lists and renumbers them", () => {
    const html = renderContentToHtml(
      "<h2>Questions</h2><ol><li><p><strong>1.</strong> First</p></li></ol><h2>Questions</h2><ol><li><p><strong>1.</strong> Second</p></li></ol>",
    );
    expect(html.match(/<h2>Questions<\/h2>/g)?.length).toBe(1);
    expect(html).toContain("<strong>1.</strong> First");
    expect(html).toContain("<strong>2.</strong> Second");
  });
});

describe("worksheet pdf-lib", () => {
  it("flattens TipTap math nodes to plain text", () => {
    const text = contentToPlainText(
      '<p>Find <span data-type="inline-math" data-latex="x^{2}"></span></p>',
    );
    expect(text).toContain("Find");
    expect(text).toContain("x^{2}");
    expect(text).not.toContain("<");
  });

  it("builds a PDF buffer without Puppeteer", async () => {
    const buffer = await buildWorksheetPdfBuffer({
      title: "local test",
      questions: [
        {
          question: "Solve 12/x^(1/3) - x^(1/3) = 4",
          type: "written",
          marks: 4,
        },
      ],
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(100);
  });
});
