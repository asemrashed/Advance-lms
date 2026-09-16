/**
 * Canonical past-paper topic taxonomy + text→numeric normalizers.
 *
 * The client's sheet tags each question with a topic (by number or name),
 * a text difficulty (Easy/Medium/Hard), a text confidence (High/Medium/Low),
 * YES/NO diagram flags, and a topic token such as "T1". This module is the
 * single source of truth for turning those human strings into the numeric /
 * boolean values stored on `PlatformQuestion`.
 *
 * NOTE: `PAST_PAPER_TOPICS` is the default 18-topic list. Adjust the labels
 * here (order = topic number) if the client's subject taxonomy differs.
 */

export interface PastPaperTopic {
  /** 1-based topic number as used across the sheet and stored in `topicNumber`. */
  number: number;
  /** Display name stored in the existing `topic` field. */
  name: string;
}

export const PAST_PAPER_TOPICS: readonly PastPaperTopic[] = [
  { number: 1, name: "Number" },
  { number: 2, name: "Algebra and Graphs" },
  { number: 3, name: "Coordinate Geometry" },
  { number: 4, name: "Geometry" },
  { number: 5, name: "Mensuration" },
  { number: 6, name: "Trigonometry" },
  { number: 7, name: "Vectors and Transformations" },
  { number: 8, name: "Probability" },
  { number: 9, name: "Statistics" },
  { number: 10, name: "Sets" },
  { number: 11, name: "Functions" },
  { number: 12, name: "Sequences" },
  { number: 13, name: "Ratio and Proportion" },
  { number: 14, name: "Percentages" },
  { number: 15, name: "Indices and Surds" },
  { number: 16, name: "Matrices" },
  { number: 17, name: "Calculus" },
  { number: 18, name: "Linear Programming" },
] as const;

const TOPIC_BY_NUMBER = new Map<number, PastPaperTopic>(
  PAST_PAPER_TOPICS.map((t) => [t.number, t]),
);
const TOPIC_BY_NAME = new Map<string, PastPaperTopic>(
  PAST_PAPER_TOPICS.map((t) => [t.name.toLowerCase(), t]),
);

/** Resolve a topic display name from a numeric topic id (or undefined). */
export function topicName(topicNumber: number | undefined | null): string | undefined {
  if (topicNumber == null) return undefined;
  return TOPIC_BY_NUMBER.get(Number(topicNumber))?.name;
}

/**
 * Parse a topic token/number/name into a numeric topic id.
 * Accepts: 7, "7", "T7", "topic 7", "Trigonometry".
 */
export function parseTopicNumber(
  value: unknown,
): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    return TOPIC_BY_NUMBER.has(value) ? value : Math.trunc(value) || undefined;
  }
  const raw = String(value).trim();
  if (!raw) return undefined;

  // "T7", "topic 7", "7." → digits
  const digits = raw.match(/\d+/);
  if (digits) {
    const n = Number.parseInt(digits[0], 10);
    if (Number.isFinite(n)) return n;
  }

  // Name lookup ("Trigonometry")
  const byName = TOPIC_BY_NAME.get(raw.toLowerCase());
  if (byName) return byName.number;

  return undefined;
}

/** Map Easy/Medium/Hard (or 1/2/3) → 1 | 2 | 3. Defaults to 2 (medium). */
export function difficultyToNumber(value: unknown): 1 | 2 | 3 {
  if (typeof value === "number") {
    if (value === 1 || value === 2 || value === 3) return value;
  }
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "1" || raw.startsWith("easy") || raw === "e") return 1;
  if (raw === "3" || raw.startsWith("hard") || raw.startsWith("diff") || raw === "h") return 3;
  if (raw === "2" || raw.startsWith("med") || raw === "m") return 2;
  return 2;
}

/** Map High/Medium/Low (or 0–1 / 0–100) confidence → 0..1. */
export function confidenceToNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clamp01(value > 1 ? value / 100 : value);
  }
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return 0.7;
  if (raw.startsWith("high") || raw === "h") return 0.9;
  if (raw.startsWith("med") || raw === "m") return 0.6;
  if (raw.startsWith("low") || raw === "l") return 0.3;
  const n = Number.parseFloat(raw);
  if (Number.isFinite(n)) return clamp01(n > 1 ? n / 100 : n);
  return 0.7;
}

/** Map YES/NO/true/1/Y → boolean. */
export function yesNoToBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "yes" || raw === "y" || raw === "true" || raw === "1";
}

/** Normalize a session token (Feb/Mar, May/Jun, Oct/Nov) → FM | MJ | ON. */
export function parseSession(value: unknown): "FM" | "MJ" | "ON" | undefined {
  const raw = String(value ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!raw) return undefined;
  if (raw === "FM" || raw.startsWith("FEB") || raw.startsWith("MAR")) return "FM";
  if (raw === "MJ" || raw.startsWith("MAY") || raw.startsWith("JUN")) return "MJ";
  if (raw === "ON" || raw.startsWith("OCT") || raw.startsWith("NOV")) return "ON";
  // Cambridge single-letter month codes: m (Feb/Mar), s (May/Jun), w (Oct/Nov)
  if (raw === "M") return "FM";
  if (raw === "S") return "MJ";
  if (raw === "W") return "ON";
  return undefined;
}

/** Derive completeness from the diagram flags (mirrors the model pre-save hook). */
export function derivePastPaperStatus(input: {
  diagramStatus?: string;
  hasMsDiagram?: boolean;
  msDiagramStatus?: string;
}): "complete" | "incomplete" {
  const qpMissing = input.diagramStatus === "missing";
  const msMissing = Boolean(input.hasMsDiagram) && input.msDiagramStatus === "missing";
  return qpMissing || msMissing ? "incomplete" : "complete";
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
