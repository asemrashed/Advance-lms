/** Allowed past-paper exam sessions (Cambridge-style). */
export const PAST_PAPER_SESSIONS = ["March", "June", "November"] as const;

export type PastPaperSession = (typeof PAST_PAPER_SESSIONS)[number];

export function isPastPaperSession(value: string): value is PastPaperSession {
  return (PAST_PAPER_SESSIONS as readonly string[]).includes(value);
}

export const PAST_PAPER_SESSION_OPTIONS = PAST_PAPER_SESSIONS.map((session) => ({
  value: session,
  label: session,
}));
