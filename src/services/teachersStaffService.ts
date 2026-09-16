import { apiFetch } from "@/lib/api/httpClient";

export const teachersStaffService = {
  listTeachers(query: string) {
    return apiFetch(`/api/teachers?${query}`);
  },

  updateTeacher(teacherId: string, body: Record<string, unknown>) {
    return apiFetch(`/api/teachers/${teacherId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  deleteTeacher(teacherId: string) {
    return apiFetch(`/api/teachers/${teacherId}`, { method: "DELETE" });
  },
};
