import { apiFetch } from "@/lib/api/httpClient";
import type {
  CreateTestYourselfTestDto,
  TestYourselfTestRow,
  UpdateTestYourselfTestDto,
} from "@/types/testYourselfTest";
import type { TestYourselfQuestion } from "@/types/testYourself";

export const testYourselfTestsService = {
  async list(query = "") {
    const suffix = query ? `?${query}` : "";
    const res = await apiFetch(`/api/test-yourself-tests${suffix}`);
    const json = (await res.json()) as {
      success?: boolean;
      data?: { tests?: TestYourselfTestRow[] };
      error?: string;
    };
    return { res, json };
  },

  async create(payload: CreateTestYourselfTestDto) {
    const res = await apiFetch("/api/test-yourself-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { test?: TestYourselfTestRow };
      error?: string;
    };
    return { res, json };
  },

  async get(id: string) {
    const res = await apiFetch(`/api/test-yourself-tests/${id}`);
    const json = (await res.json()) as {
      success?: boolean;
      data?: { test?: TestYourselfTestRow; questions?: TestYourselfQuestion[] };
      error?: string;
    };
    return { res, json };
  },

  async update(id: string, payload: UpdateTestYourselfTestDto) {
    const res = await apiFetch(`/api/test-yourself-tests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { test?: TestYourselfTestRow };
      error?: string;
    };
    return { res, json };
  },

  async remove(id: string) {
    const res = await apiFetch(`/api/test-yourself-tests/${id}`, { method: "DELETE" });
    const json = (await res.json()) as { success?: boolean; error?: string };
    return { res, json };
  },

  async bulkQuestions(payload: {
    questionIds: string[];
    subject: string;
    topic?: string;
    action?: "add" | "remove";
  }) {
    const res = await apiFetch("/api/test-yourself-tests/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { updated?: number };
      error?: string;
    };
    return { res, json };
  },

  async resolveEnrollUrl(subject: string, courseId?: string) {
    const params = new URLSearchParams({ subject });
    if (courseId) params.set("courseId", courseId);
    const res = await apiFetch(`/api/public/test-yourself/enroll-url?${params}`);
    const json = (await res.json()) as {
      success?: boolean;
      data?: { url?: string };
      error?: string;
    };
    return { res, json };
  },
};
