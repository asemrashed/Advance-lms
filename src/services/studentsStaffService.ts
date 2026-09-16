import { apiFetch } from "@/lib/api/httpClient";

export const studentsStaffService = {
  listStudents(query: string) {
    return apiFetch(`/api/students?${query}`);
  },

  listInstructorStudents(query: string) {
    return apiFetch(`/api/instructor/students?${query}`);
  },

  deleteStudent(studentId: string) {
    return apiFetch(`/api/students/${studentId}`, { method: "DELETE" });
  },
};
