import { apiFetch } from "@/lib/api/httpClient";

export const paymentsService = {
  listStudentPayments(query: string) {
    return apiFetch(`/api/student/payments?${query}`);
  },

  listInstructorPayments(query: string) {
    return apiFetch(`/api/instructor/payments?${query}`);
  },

  listAdminPayments(query: string) {
    return apiFetch(`/api/admin/payments?${query}`);
  },
};
