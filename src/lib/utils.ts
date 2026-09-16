export { cn } from "./cn";

/** Mirrors learning-project `src/lib/utils.ts` — strip HTML for safe display. */
export function htmlToPlainText(input?: string | null): string {
  if (!input) return "";

  const withoutTags = input
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  const decoded = withoutTags.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (entity, code) => {
      const named: Record<string, string> = {
        nbsp: " ",
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
      };

      if (code[0] === "#") {
        const isHex = code[1]?.toLowerCase() === "x";
        const value = parseInt(
          isHex ? code.slice(2) : code.slice(1),
          isHex ? 16 : 10,
        );
        return Number.isNaN(value) ? entity : String.fromCodePoint(value);
      }

      return named[code] ?? entity;
    },
  );

  return decoded.replace(/\s+/g, " ").trim();
}

export function getPlainTextPreview(
  input?: string | null,
  maxLength = 0,
): string {
  const text = htmlToPlainText(input);
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
