import { apiFetch } from "@/lib/api/httpClient";

export const examsStaffService = {
  listAdminExams(query: string) {
    return apiFetch(`/api/exams?${query}`);
  },

  getAdminExam(examId: string) {
    return apiFetch(`/api/exams/${examId}`);
  },

  updateExam(examId: string, body: unknown) {
    return apiFetch(`/api/exams/${examId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  deleteAdminExam(examId: string) {
    return apiFetch(`/api/exams/${examId}`, { method: "DELETE" });
  },

  listAdminExamAttempts(examId: string, query: string) {
    return apiFetch(`/api/exams/${examId}/attempts?${query}`);
  },

  deleteAdminExamAttempt(examId: string, attemptId: string) {
    return apiFetch(`/api/exams/${examId}/attempts/${attemptId}`, {
      method: "DELETE",
    });
  },

  listInstructorExams(query: string) {
    return apiFetch(`/api/instructor/exams?${query}`);
  },

  getInstructorExam(examId: string) {
    return apiFetch(`/api/instructor/exams/${examId}`);
  },

  deleteInstructorExam(examId: string) {
    return apiFetch(`/api/instructor/exams/${examId}`, { method: "DELETE" });
  },

  listInstructorExamAttempts(examId: string, query: string) {
    return apiFetch(`/api/instructor/exams/${examId}/attempts?${query}`);
  },
};
