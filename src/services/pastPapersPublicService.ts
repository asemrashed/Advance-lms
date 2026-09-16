import { apiFetch } from "@/lib/api/httpClient";
import type { PastPaperFileType } from "@/types/pastPaper";

export type PublicPastPaperRow = {
  _id: string;
  course?: { _id: string; title?: string; grade?: string } | string;
  sessionName: string;
  year: number;
  subject: string;
  examType: string;
  description?: string;
  hasQuestionPaper: boolean;
  hasMarksPdf: boolean;
  hasWorkSolution: boolean;
  createdAt?: string;
};

export type PublicPastPaperFilters = {
  subjects: string[];
  examTypes: string[];
  years: number[];
  sessionNames: string[];
  courses: { _id: string; title?: string; grade?: string }[];
};

type BrowseEnvelope = {
  success?: boolean;
  data?: {
    pastPapers?: PublicPastPaperRow[];
    filters?: PublicPastPaperFilters;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
};

export const pastPapersPublicService = {
  async browse(query = "") {
    const suffix = query ? `?${query}` : "";
    const res = await apiFetch(`/api/public/past-papers${suffix}`);
    const json = (await res.json()) as BrowseEnvelope;
    return { res, json };
  },

  downloadHref(paperId: string, type: PastPaperFileType = "question_paper") {
    return `/api/past-papers/${paperId}/download?type=${type}`;
  },

  async fetchViewUrl(paperId: string, type: PastPaperFileType = "question_paper") {
    const res = await apiFetch(
      `/api/past-papers/${paperId}/view?type=${type}`,
    );
    const json = (await res.json()) as {
      success?: boolean;
      data?: { url?: string };
      error?: string;
    };
    return { res, json };
  },
};
