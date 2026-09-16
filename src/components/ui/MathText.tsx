import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import { renderContentToHtml } from "@/lib/math/renderMathHtml";

type MathTextProps = {
  text?: string | null;
  className?: string;
  as?: ElementType;
};

/**
 * Renders question-bank / student-facing text with KaTeX.
 * Accepts plain ASCII math (e.g. 256^(x+y)) or TipTap HTML with math nodes.
 */
export function MathText({ text, className, as: Tag = "span" }: MathTextProps) {
  const html = renderContentToHtml(String(text ?? ""));
  return (
    <Tag
      className={cn("math-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

type RichHtmlProps = {
  html?: string | null;
  className?: string;
};

/** Renders stored TipTap HTML and hydrates KaTeX (math nodes + ASCII leftovers). */
export function RichHtml({ html, className }: RichHtmlProps) {
  return (
    <div
      className={cn("math-content", className)}
      dangerouslySetInnerHTML={{ __html: renderContentToHtml(String(html ?? "")) }}
    />
  );
}
