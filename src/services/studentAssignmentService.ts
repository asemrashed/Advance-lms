import { apiFetch } from "@/lib/api/httpClient";

export const studentAssignmentService = {
  listAssignments(queryParams: URLSearchParams) {
    return apiFetch(`/api/student/assignments?${queryParams.toString()}`);
  },

  getAssignment(assignmentId: string) {
    return apiFetch(`/api/student/assignments/${assignmentId}`);
  },

  uploadAssignmentFile(formData: FormData) {
    return apiFetch("/api/uploads/assignment", {
      method: "POST",
      body: formData,
      headers: {},
    });
  },

  submitAssignment(assignmentId: string, init: RequestInit) {
    return apiFetch(`/api/student/assignments/${assignmentId}/submit`, init);
  },
};
