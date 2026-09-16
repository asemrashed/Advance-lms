import type { TestYourselfAttemptRow } from "@/types/testYourself";

const HISTORY_KEY = "eduplatform-test-yourself-history";
const MAX_PUBLIC_HISTORY = 12;

export type PublicTestYourselfHistoryItem = {
  id: string;
  subject: string;
  topic?: string;
  mode: "full" | "topic";
  score: number;
  total: number;
  createdAt: string;
};

function readAll(): PublicTestYourselfHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PublicTestYourselfHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: PublicTestYourselfHistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_PUBLIC_HISTORY)));
}

export function listPublicTestYourselfHistory(): PublicTestYourselfHistoryItem[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function pushPublicTestYourselfHistory(item: {
  subject: string;
  topic?: string;
  mode: "full" | "topic";
  score: number;
  total: number;
}) {
  const next: PublicTestYourselfHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subject: item.subject,
    topic: item.topic,
    mode: item.mode,
    score: item.score,
    total: item.total,
    createdAt: new Date().toISOString(),
  };
  writeAll([next, ...readAll()]);
  return next;
}

export function toPublicHistoryFromAttempt(
  row: TestYourselfAttemptRow,
): PublicTestYourselfHistoryItem {
  return {
    id: row._id,
    subject: row.subject,
    topic: row.topic,
    mode: row.mode,
    score: row.score,
    total: row.total,
    createdAt: row.createdAt,
  };
}
