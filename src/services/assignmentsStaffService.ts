import { apiFetch } from "@/lib/api/httpClient";

export const assignmentsStaffService = {
  listAdminAssignments(query: string) {
    return apiFetch(`/api/assignments?${query}`);
  },

  deleteAdminAssignment(assignmentId: string) {
    return apiFetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
  },

  getAssignment(assignmentId: string) {
    return apiFetch(`/api/assignments/${assignmentId}`);
  },

  listSubmissions(assignmentId: string, query: string) {
    return apiFetch(
      `/api/assignments/${assignmentId}/submissions?${query}`,
    );
  },

  getSubmissionDetail(assignmentId: string, submissionId: string) {
    return apiFetch(
      `/api/assignments/${assignmentId}/submissions?submissionId=${submissionId}`,
    );
  },

  deleteSubmission(assignmentId: string, submissionId: string) {
    return apiFetch(
      `/api/assignments/${assignmentId}/submissions/${submissionId}`,
      { method: "DELETE" },
    );
  },

  gradeSubmission(
    assignmentId: string,
    submissionId: string,
    body: unknown,
    method: "POST" | "PUT" = "PUT",
  ) {
    return apiFetch(
      `/api/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      { method, body: JSON.stringify(body) },
    );
  },

  listInstructorAssignments(query: string) {
    return apiFetch(`/api/instructor/assignments?${query}`);
  },

  deleteAssignment(assignmentId: string) {
    return apiFetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
  },
};
