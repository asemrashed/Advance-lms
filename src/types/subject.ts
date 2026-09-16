export interface SubjectChapter {
  name: string;
  order: number;
}

export type SubjectComponentType = "mcq" | "written";

export interface SubjectComponent {
  _id: string;
  name: string;
  type: SubjectComponentType;
  order: number;
}

export interface Subject {
  _id: string;
  name: string;
  code: string;
  slug: string;
  grade?: string;
  /** Display label for dropdowns, e.g. "Additional Mathematics 0606". */
  optionLabel?: string;
  /** Fixed syllabus chapters (admin-owned). */
  chapters: SubjectChapter[];
  /** Exam / QB components (Paper 1 MCQ, Paper 2 Written, …). */
  components: SubjectComponent[];
  /** Platform QB access price in BDT for this subject. */
  qbAccessPrice?: number;
  isActive: boolean;
  courseCount?: number;
  questionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  grade?: string;
  chapters?: SubjectChapter[];
  components?: Omit<SubjectComponent, "_id">[];
  qbAccessPrice?: number;
  isActive?: boolean;
}

export interface UpdateSubjectRequest {
  name?: string;
  code?: string;
  grade?: string;
  chapters?: SubjectChapter[];
  components?: SubjectComponent[];
  qbAccessPrice?: number;
  isActive?: boolean;
}

export interface SubjectSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  grade?: string;
  isActive?: boolean;
  sortBy?: "name" | "code" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  /** When true, include course/question counts (slower — admin subjects page only). */
  includeCounts?: boolean;
}

export interface SubjectStats {
  totalSubjects: number;
  activeSubjects: number;
  inactiveSubjects: number;
  subjectsWithCourses: number;
}
