/** Normalize a syllabus code (e.g. 4024, 0580). */
export function normalizeSubjectCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function toSubjectSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Extract a 4-digit Cambridge-style syllabus code from a paper code or filename. */
export function extractSyllabusCode(raw: string): string | undefined {
  const text = String(raw || "").trim();
  if (!text) return undefined;
  const leading = text.match(/^(\d{4})\b/);
  if (leading) return leading[1];
  const anywhere = text.match(/\b(\d{4})\b/);
  return anywhere ? anywhere[1] : undefined;
}
