import { apiFetch } from "@/lib/api/httpClient";

type StudentExamListResponse = {
  exams: unknown[];
  pagination?: { page: number; limit: number; total: number; pages: number };
  stats?: { availableExams?: number };
};

type StudentAttemptListResponse = { attempts: unknown[] };

export const studentExamService = {
  async getStudentExams(
    queryParams: URLSearchParams,
  ): Promise<StudentExamListResponse> {
    const response = await apiFetch(
      `/api/student/exams?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch student exams (${response.status})`);
    }

    const data = (await response.json()) as { data?: StudentExamListResponse };
    return data?.data ?? { exams: [] };
  },

  async getStudentExamAttempts(
    query?: string,
  ): Promise<StudentAttemptListResponse> {
    const path = query
      ? `/api/student/exam-attempts?${query}`
      : "/api/student/exam-attempts";
    const response = await apiFetch(path);

    if (!response.ok) {
      throw new Error(`Failed to fetch exam attempts (${response.status})`);
    }

    const data = (await response.json()) as {
      data?: StudentAttemptListResponse;
    };
    return data?.data ?? { attempts: [] };
  },

  getStudentExam(examId: string) {
    return apiFetch(`/api/student/exams/${examId}`);
  },

  getStudentExamWithAnswers(examId: string) {
    return apiFetch(
      `/api/student/exams/${examId}?includeCorrectAnswers=true`,
    );
  },

  listExamAttempts(init?: RequestInit) {
    return apiFetch("/api/student/exam-attempts", init);
  },

  listExamAttemptsByQuery(query: string) {
    return apiFetch(`/api/student/exam-attempts?${query}`);
  },

  updateExamAttempt(attemptId: string, init: RequestInit) {
    return apiFetch(`/api/student/exam-attempts/${attemptId}`, init);
  },

  submitExamAttempt(attemptId: string, init?: RequestInit) {
    return apiFetch(`/api/student/exam-attempts/${attemptId}/submit`, {
      method: "POST",
      ...init,
    });
  },
};
