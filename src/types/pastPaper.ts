/** Row from `GET /api/past-papers` — aligned with PastPaper lean docs. */
export interface PastPaperRow {
  _id: string;
  course?: { _id: string; title?: string } | string;
  sessionName: string;
  year: number;
  subject: string;
  examType: string;
  questionPaperUrl?: string;
  marksPdfUrl?: string;
  workSolutionUrl?: string;
  isActive?: boolean;
  createdAt: string;
}

export interface PastPapersPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PastPapersListBody {
  pastPapers: PastPaperRow[];
  pagination: PastPapersPagination;
}

export type PastPaperFileType =
  | "question_paper"
  | "marks_pdf"
  | "work_solution";
