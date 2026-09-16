import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { looksLikeHtml, parseMixedMath } from "@/lib/math/asciiToLatex";

export type WorksheetPdfQuestion = {
  question: string;
  type: string;
  marks: number;
  options?: { text: string; isCorrect?: boolean }[];
  correctAnswer?: string;
};

export type WorksheetPdfInput = {
  title: string;
  subtitle?: string;
  questions: WorksheetPdfQuestion[];
  includeAnswers?: boolean;
};

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 45.35; // ~16mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 11;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 10;
const SECTION_SIZE = 14;
const LINE_GAP = 4;
const QUESTION_GAP = 16;

function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function answerFor(q: WorksheetPdfQuestion) {
  if (q.type === "mcq" && q.options?.length) {
    const correct = q.options
      .map((opt, i) => (opt.isCorrect ? optionLabel(i) : null))
      .filter(Boolean);
    if (correct.length) return correct.join(", ");
  }
  if (q.correctAnswer?.trim()) return q.correctAnswer.trim();
  return "—";
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

/** TipTap math nodes → LaTeX / readable math text. */
function expandTipTapMath(html: string): string {
  return html.replace(
    /<(span|div)([^>]*data-type="(inline-math|block-math)"[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_full, _tag: string, attrs: string) => {
      const latexMatch = /data-latex="([^"]*)"/.exec(attrs);
      const latex = decodeBasicEntities(latexMatch?.[1] ?? "").trim();
      return latex ? ` ${latex} ` : " ";
    },
  );
}

function stripHtmlToText(html: string): string {
  return decodeBasicEntities(
    expandTipTapMath(html)
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

/** Plain text for pdf-lib (no HTML/KaTeX — no Chromium required). */
export function contentToPlainText(value: string): string {
  if (!value) return "";
  if (looksLikeHtml(value)) return stripHtmlToText(value);
  return parseMixedMath(value)
    .map((segment) => {
      if (segment.type === "text") return segment.value;
      return segment.value.trim();
    })
    .join("")
    .trim();
}

/** Helvetica / WinAnsi can't draw every Unicode glyph. */
function toPdfSafeText(value: string): string {
  return value
    .replace(/\u2212/g, "-")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u00d7/g, "x")
    .replace(/\u00f7/g, "/")
    .replace(/\u221a/g, "sqrt")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u2260/g, "!=")
    .replace(/\u00b1/g, "+/-")
    .replace(/\u2022/g, "*")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const normalized = toPdfSafeText(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalized.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
        continue;
      }
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
      } else {
        // Hard-break oversized tokens.
        let chunk = "";
        for (const ch of word) {
          const trial = chunk + ch;
          if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
            chunk = trial;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      }
    }
    if (current) lines.push(current);
  }

  return lines.length ? lines : [""];
}

type DrawCtx = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
};

function ensureSpace(ctx: DrawCtx, needed: number) {
  if (ctx.y - needed >= MARGIN) return;
  ctx.page = ctx.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function drawWrapped(
  ctx: DrawCtx,
  text: string,
  opts: { size: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number },
) {
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const size = opts.size;
  const color = opts.color ?? rgb(0.07, 0.07, 0.07);
  const gap = opts.gap ?? LINE_GAP;
  const lines = wrapText(text, font, size, CONTENT_WIDTH);

  for (const line of lines) {
    ensureSpace(ctx, size + gap);
    if (line) {
      ctx.page.drawText(line, {
        x: MARGIN,
        y: ctx.y - size,
        size,
        font,
        color,
      });
    }
    ctx.y -= size + gap;
  }
}

function drawQuestion(ctx: DrawCtx, q: WorksheetPdfQuestion, index: number) {
  const marks = Number.isFinite(q.marks) ? q.marks : 1;
  const markLabel = `[${marks} mark${marks === 1 ? "" : "s"}]`;
  const stem = `${index + 1}. ${contentToPlainText(q.question || "")} ${markLabel}`;

  ensureSpace(ctx, BODY_SIZE * 3);
  drawWrapped(ctx, stem, { size: BODY_SIZE });

  if (q.type === "mcq" && q.options?.length) {
    for (let i = 0; i < q.options.length; i++) {
      const opt = `${optionLabel(i)}. ${contentToPlainText(q.options[i]?.text || "")}`;
      drawWrapped(ctx, `   ${opt}`, { size: BODY_SIZE });
    }
  } else if (q.type === "true_false") {
    drawWrapped(ctx, "   Circle: True / False", {
      size: BODY_SIZE,
      color: rgb(0.35, 0.35, 0.35),
    });
  } else if (q.type === "fill_blank") {
    drawWrapped(ctx, "   Answer: _______________________________", {
      size: BODY_SIZE,
      color: rgb(0.35, 0.35, 0.35),
    });
  } else {
    for (let i = 0; i < 2; i++) {
      ensureSpace(ctx, 18);
      ctx.page.drawLine({
        start: { x: MARGIN + 12, y: ctx.y - 10 },
        end: { x: PAGE_WIDTH - MARGIN, y: ctx.y - 10 },
        thickness: 0.6,
        color: rgb(0.73, 0.73, 0.73),
      });
      ctx.y -= 22;
    }
  }

  ctx.y -= QUESTION_GAP;
}

/**
 * Build worksheet PDF with pdf-lib (no Puppeteer / Chromium).
 */
export async function buildWorksheetPdfBuffer(input: WorksheetPdfInput) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const ctx: DrawCtx = {
    pdfDoc,
    page,
    font,
    fontBold,
    y: PAGE_HEIGHT - MARGIN,
  };

  const title = toPdfSafeText(input.title || "Worksheet");
  const titleWidth = fontBold.widthOfTextAtSize(title, TITLE_SIZE);
  ensureSpace(ctx, TITLE_SIZE + 8);
  ctx.page.drawText(title, {
    x: Math.max(MARGIN, (PAGE_WIDTH - titleWidth) / 2),
    y: ctx.y - TITLE_SIZE,
    size: TITLE_SIZE,
    font: fontBold,
    color: rgb(0.07, 0.07, 0.07),
  });
  ctx.y -= TITLE_SIZE + 10;

  if (input.subtitle?.trim()) {
    const subtitle = toPdfSafeText(input.subtitle.trim());
    const subWidth = font.widthOfTextAtSize(subtitle, SUBTITLE_SIZE);
    ensureSpace(ctx, SUBTITLE_SIZE + 6);
    ctx.page.drawText(subtitle, {
      x: Math.max(MARGIN, (PAGE_WIDTH - subWidth) / 2),
      y: ctx.y - SUBTITLE_SIZE,
      size: SUBTITLE_SIZE,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    ctx.y -= SUBTITLE_SIZE + 12;
  }

  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  ctx.y -= 18;

  input.questions.forEach((q, i) => drawQuestion(ctx, q, i));

  if (input.includeAnswers && input.questions.length) {
    ensureSpace(ctx, SECTION_SIZE + 40);
    // Prefer a fresh page for the answer key when mid-page.
    if (ctx.y < PAGE_HEIGHT - MARGIN - 80) {
      ctx.page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      ctx.y = PAGE_HEIGHT - MARGIN;
    }
    const heading = "Answer key";
    const headingWidth = fontBold.widthOfTextAtSize(heading, SECTION_SIZE);
    ctx.page.drawText(heading, {
      x: Math.max(MARGIN, (PAGE_WIDTH - headingWidth) / 2),
      y: ctx.y - SECTION_SIZE,
      size: SECTION_SIZE,
      font: fontBold,
      color: rgb(0.07, 0.07, 0.07),
    });
    ctx.y -= SECTION_SIZE + 14;

    input.questions.forEach((q, i) => {
      drawWrapped(ctx, `${i + 1}. ${contentToPlainText(answerFor(q))}`, {
        size: BODY_SIZE,
      });
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
