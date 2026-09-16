/**
 * Convert caret-style ASCII math (common in the question bank) into KaTeX LaTeX.
 * Examples: e^(x^2 + 3) → e^{(x^{2} + 3)}, sqrt(10) → \sqrt{10}
 */

export type MathSegment = {
  type: "text" | "math";
  value: string;
  display?: boolean;
};

const IDENT = /[A-Za-z0-9.]/;
const MATH_OPS = new Set(["+", "-", "*", "/", "=", "<", ">", "≤", "≥", "±"]);

const STOP_WORD =
  /^(where|giving|write|solve|find|explain|not|use|calculator|form|integers?|correct|decimal|places|similar|triangles?|smaller|larger|height|base|marks?|equation|answers?|your|the|and|or|in|for|of|an|to|from|with|by|are|is|that|this|which|whose|defined|functions?|exists|why|into|using|without|between|must|show|prove|hence|therefore|do|two|into|exact|values?|constants?|rational|given)$/i;

const ORDINAL_ROOT: Record<string, string> = {
  square: "2",
  cube: "3",
  cubic: "3",
  fourth: "4",
  fifth: "5",
  sixth: "6",
  seventh: "7",
  eighth: "8",
  ninth: "9",
  tenth: "10",
};

type NthRootPhrase = { n: string; start: number; ofIndex: number };

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function hasQuestionBody(value?: string | null): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (/data-latex\s*=\s*"[^"]+"/i.test(raw) || /\$[^$\n]+\$/.test(raw)) return true;
  const plain = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 0;
}

export function looksLikeLatex(value: string): boolean {
  return /\\[a-zA-Z]+|[\^_]\{|\\frac|\\sqrt|\\sum|\\int/.test(value);
}

function matchingPair(s: string, openIndex: number, dir: 1 | -1, openCh: string, closeCh: string): number {
  const open = dir === 1 ? openCh : closeCh;
  const close = dir === 1 ? closeCh : openCh;
  let depth = 0;
  for (let i = openIndex; i >= 0 && i < s.length; i += dir) {
    if (s[i] === open) depth += 1;
    else if (s[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function matchingParen(s: string, openIndex: number, dir: 1 | -1): number {
  return matchingPair(s, openIndex, dir, "(", ")");
}

function matchingBrace(s: string, openIndex: number, dir: 1 | -1): number {
  return matchingPair(s, openIndex, dir, "{", "}");
}

function skipSpaces(s: string, i: number, dir: 1 | -1 = 1): number {
  let p = i;
  while (p >= 0 && p < s.length && s[p] === " ") p += dir;
  return p;
}

function peekWord(s: string, i: number): string {
  const p = skipSpaces(s, i);
  let e = p;
  while (e < s.length && /[A-Za-z]/.test(s[e] ?? "")) e += 1;
  return s.slice(p, e);
}

function parseExponent(s: string, start: number): { exp: string; end: number } | null {
  if (start >= s.length) return null;
  if (s[start] === "(") {
    const close = matchingParen(s, start, 1);
    if (close < 0) return null;
    return { exp: s.slice(start, close + 1), end: close + 1 };
  }
  if (s[start] === "{") {
    const close = matchingBrace(s, start, 1);
    if (close < 0) return null;
    return { exp: s.slice(start, close + 1), end: close + 1 };
  }
  let i = start;
  if (s[i] === "-") i += 1;
  if (i >= s.length) return null;
  // Ungrouped: ^3r means q^3 * r, not q^{3r}. Digits stay digits; letters are one char.
  if (/[0-9.]/.test(s[i] ?? "")) {
    while (i < s.length && /[0-9.]/.test(s[i] ?? "")) i += 1;
    return { exp: s.slice(start, i), end: i };
  }
  if (/[A-Za-z]/.test(s[i] ?? "")) {
    return { exp: s.slice(start, i + 1), end: i + 1 };
  }
  return null;
}

function parseNthRootPhrase(s: string, i: number): NthRootPhrase | null {
  const start = skipSpaces(s, i);
  const rest = s.slice(start);
  const numbered = /^(\d+)(?:st|nd|rd|th)\s+root\s+of\b/i.exec(rest);
  if (numbered) {
    return { n: numbered[1], start, ofIndex: start + numbered[0].length };
  }
  const word = peekWord(s, start);
  const n = word ? ORDINAL_ROOT[word.toLowerCase()] : undefined;
  if (!n) return null;
  const afterWord = skipSpaces(s, start + word.length);
  if (!/^root\b/i.test(s.slice(afterWord))) return null;
  const afterRoot = skipSpaces(s, afterWord + 4);
  if (!/^of\b/i.test(s.slice(afterRoot))) return null;
  return { n, start, ofIndex: skipSpaces(s, afterRoot + 2) };
}

function parseRootRadicand(s: string, start: number): number {
  let end = parseTerm(s, start);
  if (end <= start) return start;
  while (true) {
    const slash = skipSpaces(s, end);
    if (s[slash] !== "/") return end;
    const after = skipSpaces(s, slash + 1);
    if (parseNthRootPhrase(s, after)) return end;
    const word = peekWord(s, after);
    if (word && STOP_WORD.test(word)) return end;
    const termEnd = parseTerm(s, after);
    if (termEnd <= after) return end;
    end = termEnd;
  }
}

function skipLatexSqrt(s: string, p: number): number {
  if (!s.startsWith("\\sqrt", p)) return p;
  let q = p + 5;
  if (s[q] === "[") {
    const close = s.indexOf("]", q);
    if (close < 0) return p;
    q = close + 1;
  }
  if (s[q] === "{") {
    const close = matchingBrace(s, q, 1);
    if (close < 0) return p;
    return close + 1;
  }
  if (s[q] === "(") {
    const close = matchingParen(s, q, 1);
    if (close < 0) return p;
    return close + 1;
  }
  return p;
}

function parseOptionalPower(s: string, p: number): number {
  if (s[p] === "^" || s[p] === "_") {
    const exp = parseExponent(s, p + 1);
    if (exp) return exp.end;
  }
  return p;
}

/** Parse one math term starting at i. Returns end index, or i if none. */
function parseTerm(s: string, i: number): number {
  let p = skipSpaces(s, i);
  if (p >= s.length) return i;

  if ((s[p] === "-" || s[p] === "+") && p + 1 < s.length && s[p + 1] !== " ") {
    const after = parseTerm(s, p + 1);
    if (after > p + 1) return after;
  }

  const start = p;

  const nth = parseNthRootPhrase(s, p);
  if (nth && nth.start === p) {
    const radEnd = parseRootRadicand(s, nth.ofIndex);
    if (radEnd > nth.ofIndex) return parseOptionalPower(s, radEnd);
  }

  if (s.slice(p, p + 5).toLowerCase() === "sqrt(") {
    const close = matchingParen(s, p + 4, 1);
    if (close < 0) return i;
    return parseOptionalPower(s, close + 1);
  }

  const sqrtEnd = skipLatexSqrt(s, p);
  if (sqrtEnd > p) return parseOptionalPower(s, sqrtEnd);

  if (s[p] === "√") {
    p += 1;
    if (s[p] === "(") {
      const close = matchingParen(s, p, 1);
      if (close < 0) return i;
      p = close + 1;
    } else {
      while (p < s.length && /[0-9.]/.test(s[p] ?? "")) p += 1;
    }
    return parseOptionalPower(s, p);
  }

  if (s[p] === "(") {
    const close = matchingParen(s, p, 1);
    if (close < 0) return i;
    return parseOptionalPower(s, close + 1);
  }

  if (s[p] === "{") {
    const close = matchingBrace(s, p, 1);
    if (close < 0) return i;
    return parseOptionalPower(s, close + 1);
  }

  if (/[0-9]/.test(s[p] ?? "")) {
    while (p < s.length && /[0-9.]/.test(s[p] ?? "")) p += 1;
    while (p < s.length && /[A-Za-z]/.test(s[p] ?? "")) p += 1;
    return parseOptionalPower(s, p);
  }

  if (/[A-Za-z]/.test(s[p] ?? "")) {
    while (p < s.length && /[A-Za-z]/.test(s[p] ?? "")) p += 1;
    const word = s.slice(start, p);
    if (word.length > 1 && STOP_WORD.test(word)) return i;
    if (s[p] === "(") {
      const close = matchingParen(s, p, 1);
      if (close >= 0) p = close + 1;
    }
    return parseOptionalPower(s, p);
  }

  return i;
}

function consumeAtomFromRight(s: string, lastIndex: number): number {
  let q = lastIndex;
  if (q < 0) return 0;

  if (s[q] === ")" || s[q] === "}") {
    const openCh = s[q] === ")" ? "(" : "{";
    const closeCh = s[q];
    const open = matchingPair(s, q, -1, openCh, closeCh);
    if (open < 0) return lastIndex + 1;
    q = open - 1;
    if (s[q] === "]") {
      const openB = matchingPair(s, q, -1, "[", "]");
      if (openB >= 5 && s.slice(openB - 5, openB) === "\\sqrt") {
        return openB - 6;
      }
    }
    if (q >= 3 && s.slice(q - 3, q + 1).toLowerCase() === "sqrt") {
      q -= 4;
    } else if (q >= 4 && s.slice(q - 4, q + 1) === "\\sqrt") {
      q -= 5;
    } else {
      while (q >= 0 && /[A-Za-z]/.test(s[q] ?? "")) q -= 1;
    }
    return q;
  }

  if (/[0-9.]/.test(s[q] ?? "")) {
    while (q >= 0 && /[0-9.]/.test(s[q] ?? "")) q -= 1;
    if (q >= 0 && s[q] === "√") q -= 1;
    while (q >= 0 && /[A-Za-z]/.test(s[q] ?? "")) q -= 1;
    while (q >= 0 && /[0-9.]/.test(s[q] ?? "")) q -= 1;
    return q;
  }

  if (/[A-Za-z]/.test(s[q] ?? "")) {
    while (q >= 0 && /[A-Za-z]/.test(s[q] ?? "")) q -= 1;
    while (q >= 0 && /[0-9.]/.test(s[q] ?? "")) q -= 1;
    return q;
  }

  if (s[q] === "√") return q - 1;
  return lastIndex + 1;
}

function termStartBefore(s: string, endExclusive: number): number {
  let q = skipSpaces(s, endExclusive - 1, -1);
  if (q < 0) return -1;

  q = consumeAtomFromRight(s, q);
  if (q >= endExclusive - 1 && !IDENT.test(s[endExclusive - 1] ?? "") && s[endExclusive - 1] !== ")") {
    return -1;
  }

  if (q >= 0 && (s[q] === "^" || s[q] === "_")) {
    q -= 1;
    q = consumeAtomFromRight(s, q);
  }

  while (q >= 0 && s[q] === " ") q -= 1;
  if (q >= 0 && (s[q] === "-" || s[q] === "+")) {
    const prev = q - 1;
    if (prev < 0 || MATH_OPS.has(s[prev] ?? "") || s[prev] === "(") {
      q -= 1;
    }
  }

  return q + 1;
}

function growRight(s: string, end: number): number {
  let p = end;
  while (true) {
    const q = skipSpaces(s, p);
    if (q >= s.length) return p;
    if (",.;?!".includes(s[q] ?? "")) return p;

    if (MATH_OPS.has(s[q] ?? "")) {
      const afterOp = skipSpaces(s, q + 1);
      const word = peekWord(s, afterOp);
      if (word && STOP_WORD.test(word) && !parseNthRootPhrase(s, afterOp)) return p;
      const termEnd = parseTerm(s, afterOp);
      if (termEnd <= afterOp) return p;
      p = termEnd;
      continue;
    }

    if (parseNthRootPhrase(s, q)) {
      const rootEnd = parseTerm(s, q);
      if (rootEnd > q) {
        p = rootEnd;
        continue;
      }
    }

    const word = peekWord(s, q);
    if (word && STOP_WORD.test(word)) return p;
    if (/[A-Za-z0-9\\]/.test(s[q] ?? "") || s[q] === "√") {
      const termEnd = parseTerm(s, q);
      if (termEnd > q) {
        p = termEnd;
        continue;
      }
    }
    return p;
  }
}

function growLeft(s: string, start: number): number {
  let p = start;
  while (true) {
    const q = skipSpaces(s, p - 1, -1);
    if (q < 0) return p;
    if (!MATH_OPS.has(s[q] ?? "")) return p;

    const termStart = termStartBefore(s, q);
    if (termStart < 0 || termStart >= q) return p;
    const word = s.slice(termStart, q).trim();
    if (word.length > 1 && STOP_WORD.test(word)) return p;
    p = termStart;
  }
}

function stripOuterParens(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("(") && matchingParen(trimmed, 0, 1) === trimmed.length - 1) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function convertTopLevelDivisions(input: string): string {
  let s = input;
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    let depthParen = 0;
    let depthBrace = 0;
    let slash = -1;
    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === "(") depthParen += 1;
      else if (s[i] === ")") depthParen -= 1;
      else if (s[i] === "{") depthBrace += 1;
      else if (s[i] === "}") depthBrace -= 1;
      else if (s[i] === "/" && depthParen === 0 && depthBrace === 0) {
        slash = i;
        break;
      }
    }
    if (slash < 0) break;
    const leftStart = termStartBefore(s, slash);
    const rightEnd = parseTerm(s, slash + 1);
    if (leftStart < 0 || rightEnd <= slash + 1) break;
    const num = stripOuterParens(s.slice(leftStart, slash));
    const den = stripOuterParens(s.slice(slash + 1, rightEnd));
    s = `${s.slice(0, leftStart)}\\frac{${num}}{${den}}${s.slice(rightEnd)}`;
  }
  return s;
}

function convertCarets(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === "^") {
      const parsed = parseExponent(s, i + 1);
      if (!parsed) {
        out += s[i];
        continue;
      }
      let inner = parsed.exp;
      if (inner.startsWith("{") && inner.endsWith("}") && matchingBrace(inner, 0, 1) === inner.length - 1) {
        inner = inner.slice(1, -1);
      }
      out += `^{${asciiMathToLatex(inner)}}`;
      i = parsed.end - 1;
      continue;
    }
    if (s[i] === "_" && s[i + 1] && s[i + 1] !== "{") {
      const parsed = parseExponent(s, i + 1);
      if (parsed) {
        out += `_{${asciiMathToLatex(parsed.exp)}}`;
        i = parsed.end - 1;
        continue;
      }
    }
    out += s[i];
  }
  return out;
}

function convertWordedRoots(input: string): string {
  let s = input;
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    let found: NthRootPhrase | null = null;
    for (let i = 0; i < s.length; i += 1) {
      const phrase = parseNthRootPhrase(s, i);
      if (phrase && phrase.start === i) {
        found = phrase;
        break;
      }
    }
    if (!found) break;
    const radEnd = parseRootRadicand(s, found.ofIndex);
    if (radEnd <= found.ofIndex) break;
    const inner = asciiMathToLatex(s.slice(found.ofIndex, radEnd).trim());
    const latex =
      found.n === "2" ? `\\sqrt{${inner}}` : `\\sqrt[${found.n}]{${inner}}`;
    s = `${s.slice(0, found.start)}${latex}${s.slice(radEnd)}`;
  }
  return s;
}

function splitPackedSuperscripts(s: string): string {
  // pq^{3r}^{-3} was meant as q^3 r^{-3}
  return s.replace(/\^\{(\d+)([A-Za-z]+)\}\^\{/g, "^{$1}$2^{");
}

function convertSimpleFractions(latex: string): string {
  return latex.replace(/(?<![A-Za-z\\])(\d+)\/(\d+)(?![A-Za-z0-9])/g, "\\frac{$1}{$2}");
}

export function asciiMathToLatex(input: string): string {
  let s = stripMathDelimiters(input.trim());
  if (!s) return "";

  s = convertWordedRoots(s);
  s = s.replace(/√\s*\(/g, "sqrt(");
  s = s.replace(/√\s*([0-9]+)/g, "sqrt($1)");
  s = s.replace(/sqrt\(([^()]*)\)/gi, (_m, inner: string) => `\\sqrt{${inner}}`);

  s = s.replace(/([A-Za-z0-9}])\s*\*\s*(?=\\sqrt|[A-Za-z(\\])/g, "$1");
  s = s.replace(/\s*\*\s*/g, " \\times ");

  s = convertTopLevelDivisions(s);
  s = convertCarets(s);
  s = splitPackedSuperscripts(s);
  s = convertSimpleFractions(s);
  s = s.replace(/([^\s=])=/g, "$1 =").replace(/=([^\s=])/g, "= $1");
  return s.replace(/\s+/g, " ").trim();
}

export function stripMathDelimiters(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
    return trimmed.slice(2, -2).trim();
  }
  if (trimmed.startsWith("$") && trimmed.endsWith("$") && trimmed.length > 2) {
    return trimmed.slice(1, -1).trim();
  }
  if (trimmed.startsWith("\\(") && trimmed.endsWith("\\)")) {
    return trimmed.slice(2, -2).trim();
  }
  if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]")) {
    return trimmed.slice(2, -2).trim();
  }
  return trimmed;
}

export function toLatex(input: string): string {
  const unwrapped = stripMathDelimiters(input);
  if (!unwrapped) return "";
  if (looksLikeLatex(unwrapped) && !unwrapped.includes("^") && !/sqrt\(/i.test(unwrapped)) {
    return unwrapped;
  }
  return asciiMathToLatex(unwrapped);
}

function pushText(segments: MathSegment[], value: string) {
  if (!value) return;
  const last = segments[segments.length - 1];
  if (last?.type === "text") {
    last.value += value;
    return;
  }
  segments.push({ type: "text", value });
}

function pushMath(segments: MathSegment[], value: string, display = false) {
  if (!value) return;
  segments.push({ type: "math", value, display });
}

function consumeDelimited(
  s: string,
  i: number,
  open: string,
  close: string,
): { end: number; latex: string } | null {
  if (!s.startsWith(open, i)) return null;
  const start = i + open.length;
  const end = s.indexOf(close, start);
  if (end < 0) return null;
  return { end: end + close.length, latex: s.slice(start, end).trim() };
}

function covered(spans: Array<{ start: number; end: number }>, index: number) {
  return spans.some((span) => index >= span.start && index < span.end);
}

function addSpan(spans: Array<{ start: number; end: number }>, start: number, end: number) {
  if (end <= start) return;
  spans.push({ start, end });
  spans.sort((a, b) => a.start - b.start);
  for (let i = 1; i < spans.length; i += 1) {
    if (spans[i].start <= spans[i - 1].end) {
      spans[i - 1].end = Math.max(spans[i - 1].end, spans[i].end);
      spans.splice(i, 1);
      i -= 1;
    }
  }
}

function findSeedRange(s: string, i: number): { start: number; end: number } | null {
  const nth = parseNthRootPhrase(s, i);
  if (nth && nth.start === i) {
    const radEnd = parseRootRadicand(s, nth.ofIndex);
    if (radEnd > nth.ofIndex) return { start: i, end: radEnd };
  }
  if (s.startsWith("sqrt(", i) || s.slice(i, i + 5).toLowerCase() === "sqrt(") {
    const close = matchingParen(s, i + 4, 1);
    if (close >= 0) return { start: i, end: close + 1 };
  }
  if (s[i] === "√") {
    const end = parseTerm(s, i);
    if (end > i) return { start: i, end };
  }
  if (s[i] === "^") {
    const baseStart = termStartBefore(s, i);
    const exp = parseExponent(s, i + 1);
    if (exp) return { start: baseStart >= 0 ? baseStart : i, end: exp.end };
  }
  if (s[i] === "(") {
    const close = matchingParen(s, i, 1);
    const after = skipSpaces(s, (close >= 0 ? close : i) + 1);
    if (close >= 0 && s[after] === "/") {
      const rightEnd = parseTerm(s, after + 1);
      if (rightEnd > after + 1) return { start: i, end: rightEnd };
    }
  }
  if (/\d/.test(s[i] ?? "") && s[i + 1] === "/" && /\d/.test(s[i + 2] ?? "")) {
    let start = i;
    while (start > 0 && /\d/.test(s[start - 1] ?? "")) start -= 1;
    let end = i + 2;
    while (end < s.length && /\d/.test(s[end] ?? "")) end += 1;
    return { start, end };
  }
  return null;
}

export function parseMixedMath(input: string): MathSegment[] {
  const s = input;
  const spans: Array<{ start: number; end: number }> = [];
  let i = 0;

  while (i < s.length) {
    if (covered(spans, i)) {
      i += 1;
      continue;
    }

    const block = consumeDelimited(s, i, "$$", "$$");
    if (block) {
      addSpan(spans, i, block.end);
      i = block.end;
      continue;
    }
    const display = consumeDelimited(s, i, "\\[", "\\]");
    if (display) {
      addSpan(spans, i, display.end);
      i = display.end;
      continue;
    }
    const inlineParen = consumeDelimited(s, i, "\\(", "\\)");
    if (inlineParen) {
      addSpan(spans, i, inlineParen.end);
      i = inlineParen.end;
      continue;
    }
    if (s[i] === "$" && s[i + 1] !== "$") {
      const end = s.indexOf("$", i + 1);
      if (end > i + 1) {
        addSpan(spans, i, end + 1);
        i = end + 1;
        continue;
      }
    }

    const seed = findSeedRange(s, i);
    if (seed) {
      const grown = {
        start: growLeft(s, seed.start),
        end: growRight(s, seed.end),
      };
      addSpan(spans, grown.start, grown.end);
      i = grown.end;
      continue;
    }

    i += 1;
  }

  const segments: MathSegment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) pushText(segments, s.slice(cursor, span.start));
    const raw = s.slice(span.start, span.end);
    const delimited =
      (raw.startsWith("$$") && raw.endsWith("$$")) ||
      (raw.startsWith("$") && raw.endsWith("$")) ||
      raw.startsWith("\\[") ||
      raw.startsWith("\\(");
    pushMath(segments, asciiMathToLatex(raw), delimited && (raw.startsWith("$$") || raw.startsWith("\\[")));
    cursor = span.end;
  }
  if (cursor < s.length) pushText(segments, s.slice(cursor));
  if (!segments.length) pushText(segments, s);
  return segments;
}
