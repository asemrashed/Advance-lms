import { apiFetch } from "@/lib/api/httpClient";
import type { ResourceCenterAccess } from "@/types/resourceAccess";
import type {
  TestYourselfAccess,
  TestYourselfAnswerInput,
  TestYourselfAttemptMode,
  TestYourselfAttemptRow,
  TestYourselfCheckResult,
  TestYourselfQuestion,
  TestYourselfSubjectCard,
  TestYourselfTopic,
} from "@/types/testYourself";

export type LoadQuestionsParams = {
  subject: string;
  mode: TestYourselfAttemptMode;
  topic?: string;
  difficulty?: number | "all";
};

export const testYourselfService = {
  async browseCatalog(query = "") {
    const suffix = query ? `?${query}` : "";
    const res = await apiFetch(`/api/public/test-yourself${suffix}`);
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        subjects?: TestYourselfSubjectCard[];
        subjectNames?: string[];
        topics?: TestYourselfTopic[];
        access?: ResourceCenterAccess;
      };
      error?: string;
    };
    return { res, json };
  },

  async loadQuestions(params: LoadQuestionsParams) {
    const search = new URLSearchParams({
      subject: params.subject,
      mode: params.mode,
    });
    if (params.mode === "topic" && params.topic) {
      search.set("topic", params.topic);
    }
    if (params.difficulty && params.difficulty !== "all") {
      search.set("difficulty", String(params.difficulty));
    }
    const res = await apiFetch(`/api/public/test-yourself/questions?${search}`);
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        subject: string;
        topic: string | null;
        mode: TestYourselfAttemptMode;
        difficulty: number | null;
        questions?: TestYourselfQuestion[];
        access?: TestYourselfAccess;
      };
      error?: string;
    };
    return { res, json };
  },

  async checkAnswers(payload: {
    subject: string;
    mode: TestYourselfAttemptMode;
    topic?: string;
    difficulty?: number;
    answers: TestYourselfAnswerInput[];
  }) {
    const res = await apiFetch("/api/public/test-yourself/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        score: number;
        total: number;
        results: TestYourselfCheckResult[];
        attemptId?: string;
      };
      error?: string;
    };
    return { res, json };
  },

  async listAttempts(limit = 50) {
    const res = await apiFetch(
      `/api/public/test-yourself/attempts?limit=${limit}`,
    );
    const json = (await res.json()) as {
      success?: boolean;
      data?: { attempts?: TestYourselfAttemptRow[] };
      error?: string;
    };
    return { res, json };
  },
};
