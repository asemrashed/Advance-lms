import katex from "katex";
import {
  asciiMathToLatex,
  looksLikeHtml,
  parseMixedMath,
} from "@/lib/math/asciiToLatex";

const KATEX_OPTIONS = {
  throwOnError: false,
  strict: false as const,
  output: "html" as const,
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&amp;/gi, "&");
}

export function renderLatexToHtml(latex: string, displayMode = false): string {
  const trimmed = latex.trim();
  if (!trimmed) return "";
  try {
    return katex.renderToString(trimmed, {
      ...KATEX_OPTIONS,
      displayMode,
    });
  } catch {
    return `<span class="math-fallback">${escapeHtml(trimmed)}</span>`;
  }
}

export function renderMixedTextToHtml(text: string): string {
  if (!text) return "";
  return parseMixedMath(text)
    .map((segment) => {
      if (segment.type === "text") return escapeHtml(segment.value);
      return renderLatexToHtml(segment.value, Boolean(segment.display));
    })
    .join("");
}

function decodeAttr(value: string): string {
  return decodeBasicEntities(value);
}

function replaceTipTapMathNodes(html: string): string {
  return html.replace(
    /<(span|div)([^>]*data-type="(inline-math|block-math)"[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_full, _tag: string, attrs: string, type: string) => {
      const latexMatch = /data-latex="([^"]*)"/.exec(attrs);
      const latex = decodeAttr(latexMatch?.[1] ?? "");
      return renderLatexToHtml(asciiMathToLatex(latex) || latex, type === "block-math");
    },
  );
}

function mapHtmlTextNodes(html: string, map: (text: string) => string): string {
  return html.replace(/(^|>)([^<]*)/g, (_full, prefix: string, text: string) => {
    if (!text) return prefix;
    return prefix + map(decodeBasicEntities(text));
  });
}

export function hydrateHtmlMath(html: string): string {
  if (!html) return "";
  const merged = coalesceRepeatedQuestionLists(html);
  const withAscii = mapHtmlTextNodes(merged, (text) => renderMixedTextToHtml(text));
  return replaceTipTapMathNodes(withAscii);
}

/** Merge repeated `<h2>Questions</h2><ol>` blocks from one-at-a-time bank inserts. */
export function coalesceRepeatedQuestionLists(html: string): string {
  const blockRe = /<h2>Questions<\/h2>\s*<ol>([\s\S]*?)<\/ol>/gi;
  const matches = [...html.matchAll(blockRe)];
  if (matches.length < 2) return html;

  const items: string[] = [];
  for (const match of matches) {
    const inner = match[1] ?? "";
    const lis = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((row) => row[1] ?? "");
    items.push(...lis);
  }
  if (!items.length) return html;

  const renumbered = items.map((item, index) => {
    const body = item.replace(
      /(<p>\s*)<strong>\s*\d+\.\s*<\/strong>/i,
      `$1<strong>${index + 1}.</strong>`,
    );
    return `<li>${body}</li>`;
  });
  const merged = `<h2>Questions</h2><ol>${renumbered.join("")}</ol>`;
  let first = true;
  return html.replace(blockRe, () => {
    if (first) {
      first = false;
      return merged;
    }
    return "";
  });
}

export function renderContentToHtml(value: string): string {
  if (!value) return "";
  if (looksLikeHtml(value)) return hydrateHtmlMath(value);
  return renderMixedTextToHtml(value);
}

export function questionToHtmlFragment(question: string): string {
  if (!question) return "";
  if (looksLikeHtml(question)) {
    return question.replace(/^\s*<p>/i, "").replace(/<\/p>\s*$/i, "");
  }
  return escapeHtml(question);
}
