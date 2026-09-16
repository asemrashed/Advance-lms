/**
 * Subject exam-component helpers — components live on Subject and define
 * MCQ vs Written papers (e.g. "Paper 1") for QB + exams.
 *
 * Keep this file free of mongoose/mongodb so client components can import it.
 */

export type SubjectComponentType = "mcq" | "written";

export type SubjectComponentInput = {
  _id?: string;
  name: string;
  type: SubjectComponentType;
  order: number;
};

/** 24-char hex ObjectId check (browser-safe; no mongoose). */
export function isObjectIdString(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export function isSubjectComponentType(value: unknown): value is SubjectComponentType {
  return value === "mcq" || value === "written";
}

/** Normalize raw component payloads from API / UI into ordered unique rows. */
export function normalizeSubjectComponents(raw: unknown): SubjectComponentInput[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: SubjectComponentInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const obj = row as Record<string, unknown>;
    const name = String(obj.name || obj.title || "").trim();
    const typeRaw = String(obj.type || "").trim().toLowerCase();
    if (!name || !isSubjectComponentType(typeRaw)) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let order = i + 1;
    const o = Number(obj.order);
    if (Number.isFinite(o) && o > 0) order = Math.trunc(o);

    const idRaw = obj._id != null ? String(obj._id).trim() : "";
    const entry: SubjectComponentInput = { name, type: typeRaw, order };
    if (idRaw && isObjectIdString(idRaw)) {
      entry._id = idRaw;
    }
    out.push(entry);
  }

  out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return out.map((c, idx) => ({
    ...c,
    order: idx + 1,
  }));
}

export function findSubjectComponent(
  components: SubjectComponentInput[] | undefined | null,
  componentId: string | undefined | null,
): SubjectComponentInput | undefined {
  const id = String(componentId || "").trim();
  if (!id) return undefined;
  return (components || []).find((c) => c._id === id);
}

export function componentLabel(c: Pick<SubjectComponentInput, "name" | "type">): string {
  const typeLabel = c.type === "mcq" ? "MCQ" : "Written";
  return `${c.name} (${typeLabel})`;
}
