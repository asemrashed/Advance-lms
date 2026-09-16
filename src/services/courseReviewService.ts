import { apiFetch } from "@/lib/api/httpClient";

export const courseReviewService = {
  listReviews(query: string) {
    return apiFetch(`/api/course-reviews?${query}`);
  },

  listReviewsByStudent(studentId: string) {
    return apiFetch(`/api/course-reviews?student=${studentId}`);
  },

  listEnrollmentsForStudent(studentId: string) {
    return apiFetch(`/api/enrollments?student=${studentId}&limit=1000`);
  },

  voteReview(reviewId: string, body: unknown) {
    return apiFetch(`/api/course-reviews/${reviewId}/vote`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deleteReview(reviewId: string) {
    return apiFetch(`/api/course-reviews/${reviewId}`, { method: "DELETE" });
  },

  submitReview(reviewId: string | null, body: unknown) {
    const url = reviewId
      ? `/api/course-reviews/${reviewId}`
      : "/api/course-reviews";
    return apiFetch(url, {
      method: reviewId ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
  },

  listAdminReviews(query: string) {
    return apiFetch(`/api/admin/course-reviews?${query}`);
  },

  listAdminReviewsAll() {
    return apiFetch("/api/admin/course-reviews");
  },

  createAdminReview(body: unknown) {
    return apiFetch("/api/admin/course-reviews", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateAdminReview(reviewId: string, body: unknown) {
    return apiFetch(`/api/admin/course-reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  deleteAdminReview(reviewId: string) {
    return apiFetch(`/api/admin/course-reviews/${reviewId}`, {
      method: "DELETE",
    });
  },

  blockStudentReviews(studentId: string, body: unknown) {
    return apiFetch(`/api/admin/students/${studentId}/block-reviews`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  seedReviews() {
    return apiFetch("/api/admin/seed-reviews", { method: "POST" });
  },
};
