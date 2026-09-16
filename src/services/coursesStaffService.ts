import { apiFetch } from "@/lib/api/httpClient";

export const coursesStaffService = {
  listCourses(query: string, init?: RequestInit) {
    return apiFetch(`/api/courses?${query}`, init);
  },

  listCategories() {
    return apiFetch("/api/categories");
  },

  listInstructorUsers() {
    return apiFetch("/api/users?role=instructor,teacher,admin");
  },

  listStudentUsers(limit = 100) {
    return apiFetch(`/api/users?role=student&limit=${limit}`);
  },

  createCourse(body: unknown) {
    return apiFetch("/api/courses", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateCourse(courseId: string, body: unknown) {
    return apiFetch(`/api/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  deleteCourse(courseId: string) {
    return apiFetch(`/api/courses/${courseId}`, { method: "DELETE" });
  },

  reorderCourses(body: unknown) {
    return apiFetch("/api/courses/reorder", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  listInstructorCourses(limit?: number) {
    const query = limit != null ? `?limit=${limit}` : "";
    return apiFetch(`/api/instructor/courses${query}`);
  },

  listCourseBatches(courseId: string) {
    return apiFetch(`/api/courses/${courseId}/batches`);
  },

  getCurriculumSuggestions(targetBatchId: string, sourceBatchId: string) {
    return apiFetch(
      `/api/batches/${targetBatchId}/curriculum-suggestions?sourceBatchId=${encodeURIComponent(sourceBatchId)}`,
    );
  },

  copyBatchCurriculumStructure(targetBatchId: string, sourceBatchId: string) {
    return apiFetch(`/api/batches/${targetBatchId}/copy-curriculum-structure`, {
      method: "POST",
      body: JSON.stringify({ sourceBatchId }),
    });
  },

  listCurriculumSourceCourses(courseId: string) {
    return apiFetch(`/api/courses/${courseId}/curriculum-sources`);
  },

  getCourseCurriculumSuggestions(targetCourseId: string, sourceCourseId: string) {
    return apiFetch(
      `/api/courses/${targetCourseId}/curriculum-suggestions?sourceCourseId=${encodeURIComponent(sourceCourseId)}`,
    );
  },

  copyCourseCurriculum(
    targetCourseId: string,
    body: { sourceCourseId: string; chapterIds?: string[]; lessonIds?: string[] },
  ) {
    return apiFetch(`/api/courses/${targetCourseId}/copy-curriculum`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
