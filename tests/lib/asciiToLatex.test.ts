import { describe, expect, it } from "vitest";
import {
  asciiMathToLatex,
  parseMixedMath,
  toLatex,
} from "@/lib/math/asciiToLatex";

describe("asciiMathToLatex", () => {
  it("converts nested caret exponents", () => {
    expect(asciiMathToLatex("e^(x^2 + 3)")).toBe("e^{(x^{2} + 3)}");
  });

  it("converts grouped exponents", () => {
    expect(asciiMathToLatex("256^(x+y)")).toBe("256^{(x+y)}");
  });

  it("converts fractional exponents", () => {
    expect(asciiMathToLatex("x^(1/3)")).toBe("x^{(\\frac{1}{3})}");
  });

  it("converts inverse-function notation", () => {
    expect(asciiMathToLatex("f^(-1)")).toBe("f^{(-1)}");
  });

  it("converts an equation with ASCII caret math", () => {
    expect(asciiMathToLatex("f(x) = e^(x^2 + 3)")).toBe("f(x) = e^{(x^{2} + 3)}");
  });

  it("converts sqrt and juxtaposition", () => {
    expect(asciiMathToLatex("11*sqrt(10)")).toBe("11\\sqrt{10}");
  });

  it("treats q^3r^-3 as q cubed times r to the minus three", () => {
    const latex = asciiMathToLatex("(sqrt(pq^3r^-3))/(pq^-1)^(r-1) = p^a q^b r^c");
    expect(latex).toContain("q^{3}");
    expect(latex).toContain("r^{-3}");
    expect(latex).not.toMatch(/\^\{3r\}/);
    expect(latex).toContain("\\frac{");
    expect(latex).toContain("p^{a}");
  });

  it("converts cube root / fourth root wording into nested radicals", () => {
    const latex = asciiMathToLatex(
      "cube root of xy(zy)^2 / (xz)^3 / fourth root of z = x^a y^b z^c",
    );
    expect(latex).toContain("\\sqrt[3]");
    expect(latex).toContain("\\sqrt[4]");
    expect(latex).not.toContain("fourth");
    expect(latex).toContain("\\frac{");
  });

  it("converts parenthesized rationalising expressions", () => {
    const latex = asciiMathToLatex("(16 + 11*sqrt(10)) / (2 + sqrt(10)) + 1");
    expect(latex).toContain("\\frac{");
    expect(latex).toContain("\\sqrt{10}");
    expect(latex).not.toContain("sqrt(");
  });
});

describe("toLatex", () => {
  it("accepts already-delimited latex", () => {
    expect(toLatex("$e^{x}$")).toBe("e^{x}");
  });
});

describe("parseMixedMath", () => {
  it("keeps surrounding prose and renders math atoms", () => {
    const text =
      "The functions f and fg are defined by f(x) = e^(x^2 + 3) for x < 0 and fg(x) = e^(2x) for x > 3/2. Explain why f^(-1) exists. [1 mark]";
    const segments = parseMixedMath(text);
    const math = segments.filter((s) => s.type === "math").map((s) => s.value);

    expect(math.some((m) => m.includes("e^{(x^{2} + 3)}"))).toBe(true);
    expect(math.some((m) => m.includes("e^{(2x)}"))).toBe(true);
    expect(math.some((m) => m.includes("\\frac{3}{2}"))).toBe(true);
    expect(math).toContain("f^{(-1)}");
    expect(segments.some((s) => s.type === "text" && s.value.includes("Explain why"))).toBe(
      true,
    );
  });

  it("leaves plain sentences unchanged", () => {
    const segments = parseMixedMath("Explain why the inverse exists.");
    expect(segments).toEqual([{ type: "text", value: "Explain why the inverse exists." }]);
  });

  it("captures a full surd expression in prose", () => {
    const text =
      "Write (16 + 11*sqrt(10)) / (2 + sqrt(10)) + 1 in the form p + q*sqrt(10), where p and q are integers.";
    const math = parseMixedMath(text)
      .filter((s) => s.type === "math")
      .map((s) => s.value);
    expect(math[0]).toContain("\\frac{");
    expect(math[0]).toContain("\\sqrt{10}");
    expect(math.join(" ")).toMatch(/p\s*\+\s*q\\sqrt\{10\}/);
  });

  it("captures a full power equation including both sides", () => {
    const text =
      "Solve the equation 6x^(3/5)+1=12/x^(3/5), giving your answers correct to 2 decimal places.";
    const math = parseMixedMath(text)
      .filter((s) => s.type === "math")
      .map((s) => s.value)
      .join(" ");
    expect(math).toContain("6x");
    expect(math).toContain("\\frac{12}");
    expect(math).toContain("\\frac{3}{5}");
    expect(math).not.toContain("12/");
  });

  it("captures subtracted root terms in an equation", () => {
    const text = "Solve the equation 12/x^(1/3) - x^(1/3) = 4";
    const math = parseMixedMath(text)
      .filter((s) => s.type === "math")
      .map((s) => s.value)
      .join(" ");
    expect(math).toContain("\\frac{12}");
    expect(math).toContain("x^{(\\frac{1}{3})}");
    expect(math).toContain("= 4");
  });

  it("keeps implicit multiplication between powered letters", () => {
    const math = parseMixedMath(
      "Find constants a, b and c such that (sqrt(pq^3r^-3))/(pq^-1)^(r-1) = p^a q^b r^c",
    )
      .filter((s) => s.type === "math")
      .map((s) => s.value)
      .join(" ");
    expect(math).toContain("q^{3}");
    expect(math).toContain("r^{-3}");
    expect(math).not.toMatch(/\^\{3r\}/);
  });

  it("treats cube root ... / fourth root as two radicals", () => {
    const math = parseMixedMath(
      "Given that cube root of xy(zy)^2 / (xz)^3 / fourth root of z = x^a y^b z^c, find exact values of a, b, c",
    )
      .filter((s) => s.type === "math")
      .map((s) => s.value)
      .join(" ");
    expect(math).toContain("\\sqrt[3]");
    expect(math).toContain("\\sqrt[4]");
    expect(math).not.toContain("fourth");
  });
});
