import type { TestYourselfCheckResult } from "@/types/testYourself";
import { testYourselfSessionKey } from "@/lib/resources/testYourselfTestName";

const STORAGE_KEY = "eduplatform-test-yourself-sessions";

export type TestYourselfSessionStatus =
  | "in_progress"
  | "submitted_free"
  | "completed";

export type TestYourselfStoredSession = {
  subject: string;
  topic: string;
  totalQuestionCount: number;
  freeLimit: number;
  status: TestYourselfSessionStatus;
  selections: Record<string, number | string>;
  currentIndex: number;
  freeResults?: TestYourselfCheckResult[];
  freeScore?: number;
  results?: TestYourselfCheckResult[];
  score?: number;
  updatedAt: string;
};

function sessionKey(subject: string, topic: string) {
  return testYourselfSessionKey(subject, topic);
}

function readAll(): Record<string, TestYourselfStoredSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, TestYourselfStoredSession>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, TestYourselfStoredSession>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getTestYourselfSession(
  subject: string,
  topic: string,
): TestYourselfStoredSession | null {
  const all = readAll();
  return all[sessionKey(subject, topic)] ?? null;
}

export function saveTestYourselfSession(session: TestYourselfStoredSession) {
  const all = readAll();
  all[sessionKey(session.subject, session.topic)] = {
    ...session,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
}

export function clearTestYourselfSession(subject: string, topic: string) {
  const all = readAll();
  delete all[sessionKey(subject, topic)];
  writeAll(all);
}

export function listTestYourselfSessions(): TestYourselfStoredSession[] {
  return Object.values(readAll());
}
