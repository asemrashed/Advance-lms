import { apiFetch } from "@/lib/api/httpClient";

function bankBase(role: "admin" | "instructor") {
  return role === "admin" ? "/api/admin/question-bank" : "/api/instructor/question-bank";
}

export const questionsStaffService = {
  listQuestionBank(role: "admin" | "instructor", query: string) {
    return apiFetch(`${bankBase(role)}?${query}`);
  },

  questionBankStats(role: "admin" | "instructor", query: string) {
    return apiFetch(`${bankBase(role)}/stats?${query}`);
  },

  questionBankBulk(
    role: "admin" | "instructor",
    body: { ids: string[]; action: "delete" | "activate" | "deactivate" },
  ) {
    return apiFetch(`${bankBase(role)}/bulk`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  listAdminQuestions(query: string) {
    return apiFetch(`/api/questions?${query}`);
  },

  listAdminExamsForBank() {
    return apiFetch("/api/exams");
  },

  createAdminQuestion(body: unknown) {
    return apiFetch("/api/questions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deleteAdminQuestion(questionId: string) {
    return apiFetch(`/api/questions/${questionId}`, { method: "DELETE" });
  },

  listInstructorQuestions(query: string) {
    return apiFetch(`/api/instructor/questions?${query}`);
  },

  deleteInstructorQuestion(questionId: string) {
    return apiFetch(`/api/questions/${questionId}`, {
      method: "DELETE",
    });
  },
};
