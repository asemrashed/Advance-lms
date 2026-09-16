import { apiFetch } from "@/lib/api/httpClient";

export const faqAdminService = {
  listFaqsForCourse(courseId: string) {
    return apiFetch(`/api/admin/faqs?course=${courseId}&limit=100`);
  },

  updateFaq(faqId: string, body: unknown, method: "PUT" | "PATCH" = "PUT") {
    return apiFetch(`/api/admin/faqs/${faqId}`, {
      method,
      body: JSON.stringify(body),
    });
  },

  bulkCreateFaqs(body: unknown) {
    return apiFetch("/api/admin/faqs/bulk", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deleteFaq(faqId: string) {
    return apiFetch(`/api/admin/faqs/${faqId}`, { method: "DELETE" });
  },
};
