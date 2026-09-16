import { apiFetch } from "@/lib/api/httpClient";

export const enrollmentsStaffService = {
  listAdminEnrollments(query: string) {
    return apiFetch(`/api/admin/enrollments?${query}`);
  },

  createAdminEnrollment(body: unknown) {
    return apiFetch("/api/admin/enrollments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateAdminEnrollment(enrollmentId: string, body: unknown) {
    return apiFetch(`/api/admin/enrollments/${enrollmentId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  deleteAdminEnrollment(enrollmentId: string) {
    return apiFetch(`/api/admin/enrollments/${enrollmentId}`, {
      method: "DELETE",
    });
  },

  listInstructorEnrollments(query: string) {
    return apiFetch(`/api/instructor/enrollments?${query}`);
  },

  createInstructorEnrollment(body: unknown) {
    return apiFetch("/api/instructor/enrollments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateInstructorEnrollment(enrollmentId: string, body: unknown) {
    return apiFetch(`/api/instructor/enrollments/${enrollmentId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  deleteInstructorEnrollment(enrollmentId: string) {
    return apiFetch(`/api/instructor/enrollments/${enrollmentId}`, {
      method: "DELETE",
    });
  },
};
