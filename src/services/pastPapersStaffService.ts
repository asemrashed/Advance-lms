import { apiFetch } from "@/lib/api/httpClient";

export const pastPapersStaffService = {
  listPastPapers(query: string) {
    return apiFetch(`/api/past-papers?${query}`);
  },

  getPastPaper(paperId: string) {
    return apiFetch(`/api/past-papers/${paperId}`);
  },

  deletePastPaper(paperId: string) {
    return apiFetch(`/api/past-papers/${paperId}`, { method: "DELETE" });
  },
};
