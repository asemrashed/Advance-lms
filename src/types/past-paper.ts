export enum PaperType {
  QUESTION_PAPER = "question_paper",
  MARKS_PDF = "marks_pdf",
  WORK_SOLUTION = "work_solution",
}

export interface IPastPaper {
  _id: string;
  id?: string;
  course?: string | { _id: string; title?: string };
  subjectId?: string;
  subjectCode?: string;
  sessionName: string;
  year: number;
  subject: string;
  grade?: string;
  examType: string;
  questionPaperUrl?: string;
  marksPdfUrl?: string;
  workSolutionUrl?: string;
  description?: string;
  tags?: string;
  isActive?: boolean;
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PastPaper = IPastPaper;

export interface CreatePastPaperDto {
  course?: string;
  courseId?: string;
  subjectId?: string;
  subjectCode?: string;
  sessionName: string;
  year: number;
  subject: string;
  grade?: string;
  examType: string;
  questionPaperUrl?: string;
  marksPdfUrl?: string;
  workSolutionUrl?: string;
  description?: string;
  tags?: string;
  isActive?: boolean;
}

export interface UpdatePastPaperDto {
  sessionName?: string;
  year?: number;
  subject?: string;
  subjectId?: string;
  subjectCode?: string;
  grade?: string;
  examType?: string;
  questionPaperUrl?: string;
  marksPdfUrl?: string;
  workSolutionUrl?: string;
  description?: string;
  tags?: string;
  isActive?: boolean;
}

export interface PastPaperFilters {
  sessionName?: string;
  year?: number;
  subject?: string;
  examType?: string;
  paperType?: PaperType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PastPaperResponse {
  pastPapers: PastPaper[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PastPaperStats {
  totalPapers: number;
  activePapers: number;
  inactivePapers: number;
  papersByType: {
    questionPapers: number;
    marksPdfs: number;
    workSolutions: number;
  };
  papersBySubject: Record<string, number>;
  papersByYear: Record<number, number>;
  recentUploads: PastPaper[];
}

export interface PastPaperUploadResult {
  success: boolean;
  pastPaper?: PastPaper;
  error?: string;
  uploadResults?: {
    questionPaper?: {
      success: boolean;
      url?: string;
      error?: string;
    };
    marksPdf?: {
      success: boolean;
      url?: string;
      error?: string;
    };
    workSolution?: {
      success: boolean;
      url?: string;
      error?: string;
    };
  };
}
