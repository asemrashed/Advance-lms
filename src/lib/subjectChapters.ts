/**
 * Subject chapter helpers — chapters live on Subject and are the source of
 * truth for course curriculum structure and platform QB topics.
 */

export type SubjectChapterInput = {
  name: string;
  order: number;
};

export type TopicRef = {
  number: number;
  name: string;
};

/** Normalize raw chapter payloads from API / UI into ordered unique names. */
export function normalizeSubjectChapters(raw: unknown): SubjectChapterInput[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: SubjectChapterInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    let name = "";
    let order = i + 1;
    if (typeof row === "string") {
      name = row.trim();
    } else if (row && typeof row === "object") {
      const obj = row as Record<string, unknown>;
      name = String(obj.name || obj.title || "").trim();
      const o = Number(obj.order);
      if (Number.isFinite(o) && o > 0) order = Math.trunc(o);
    }
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, order });
  }

  out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return out.map((c, idx) => ({ name: c.name, order: idx + 1 }));
}

/** Parse a paste block (one chapter name per line) into chapters. */
export function parseChapterLines(text: string): SubjectChapterInput[] {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return normalizeSubjectChapters(lines);
}

/** Map subject chapters → 1-based topic list for Haiku / past-paper prompts. */
export function topicsFromSubjectChapters(
  chapters: SubjectChapterInput[] | undefined | null,
): TopicRef[] {
  const list = normalizeSubjectChapters(chapters || []);
  return list.map((c) => ({ number: c.order, name: c.name }));
}

export function topicNameFromList(
  topicNumber: number | undefined | null,
  topics: readonly TopicRef[],
): string | undefined {
  if (topicNumber == null) return undefined;
  return topics.find((t) => t.number === Number(topicNumber))?.name;
}

export function parseTopicNumberFromList(
  value: unknown,
  topics: readonly TopicRef[],
): number | undefined {
  if (value == null || value === "") return undefined;
  const byNumber = new Map(topics.map((t) => [t.number, t]));
  const byName = new Map(topics.map((t) => [t.name.toLowerCase(), t]));

  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.trunc(value);
    return byNumber.has(n) ? n : undefined;
  }
  const raw = String(value).trim();
  if (!raw) return undefined;

  const digits = raw.match(/\d+/);
  if (digits) {
    const n = Number.parseInt(digits[0], 10);
    if (Number.isFinite(n) && byNumber.has(n)) return n;
  }

  const byNameHit = byName.get(raw.toLowerCase());
  if (byNameHit) return byNameHit.number;

  return undefined;
}

/** 1-based chapter order for a topic name, or a large number when unknown. */
export function chapterOrderForTopic(
  topicName: string | null | undefined,
  chapters: SubjectChapterInput[] | undefined | null,
): number {
  const want = String(topicName || "").trim().toLowerCase();
  if (!want) return Number.MAX_SAFE_INTEGER - 1;
  const list = normalizeSubjectChapters(chapters || []);
  const hit = list.find((c) => c.name.trim().toLowerCase() === want);
  return hit ? hit.order : Number.MAX_SAFE_INTEGER;
}

/** Sort topic/chapter names by Subject.chapters serial; unknown names go last (A–Z). */
export function sortTopicNamesByChapters(
  topics: string[],
  chapters: SubjectChapterInput[] | undefined | null,
): string[] {
  const list = normalizeSubjectChapters(chapters || []);
  if (!list.length) {
    return [...topics].sort((a, b) => a.localeCompare(b));
  }
  return [...topics].sort((a, b) => {
    const ao = chapterOrderForTopic(a, list);
    const bo = chapterOrderForTopic(b, list);
    if (ao !== bo) return ao - bo;
    return a.localeCompare(b);
  });
}

/** Sort rows by chapter serial of their topic field. */
export function sortRowsByChapterTopic<T>(
  rows: T[],
  getTopic: (row: T) => string | null | undefined,
  chapters: SubjectChapterInput[] | undefined | null,
): T[] {
  const list = normalizeSubjectChapters(chapters || []);
  if (!list.length) return rows;
  return [...rows].sort((a, b) => {
    const ao = chapterOrderForTopic(getTopic(a), list);
    const bo = chapterOrderForTopic(getTopic(b), list);
    if (ao !== bo) return ao - bo;
    return String(getTopic(a) || "").localeCompare(String(getTopic(b) || ""));
  });
}
