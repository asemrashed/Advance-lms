import { apiFetch } from "@/lib/api/httpClient";

export type PublicCatalogFilterQuery = {
  courseType?: "live" | "recorded";
  grade?: string;
  subjectId?: string;
  instructorId?: string;
};

function toSearchParams(params?: PublicCatalogFilterQuery): string {
  const q = new URLSearchParams();
  if (params?.courseType) q.set("courseType", params.courseType);
  if (params?.grade && params.grade !== "all") q.set("grade", params.grade);
  if (params?.subjectId && params.subjectId !== "all") {
    q.set("subjectId", params.subjectId);
  }
  if (params?.instructorId && params.instructorId !== "all") {
    q.set("instructorId", params.instructorId);
  }
  const serialized = q.toString();
  return serialized ? `?${serialized}` : "";
}

export const publicCatalogService = {
  listCategories() {
    return apiFetch("/api/public/categories");
  },
  listSubjects(params?: PublicCatalogFilterQuery) {
    return apiFetch(`/api/public/subjects${toSearchParams(params)}`);
  },
  listInstructors(params?: PublicCatalogFilterQuery) {
    return apiFetch(`/api/public/instructors${toSearchParams(params)}`);
  },
};
