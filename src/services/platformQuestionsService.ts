import { apiFetch } from "@/lib/api/httpClient";

export type GeneratedQuestionDraft = {
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: 1 | 2 | 3;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  answerText?: string;
  explanation?: string;
  hasDiagram?: boolean;
  diagramUrl?: string;
  aiTagConfidence?: number;
};

export type PastPaperQuestionDraftPayload = {
  qid?: string;
  subject?: string;
  subjectCode?: string;
  topic?: string;
  topicNumber?: number;
  subtopic?: string;
  difficulty?: 1 | 2 | 3;
  questionFormat?: "mcq" | "written";
  questionText: string;
  answerText?: string;
  msText?: string;
  explanation?: string;
  marks?: number;
  year?: number;
  session?: "FM" | "MJ" | "ON";
  paper?: string;
  questionNumber?: string;
  calculatorType?: string;
  hasDiagram?: boolean;
  diagramUrl?: string;
  diagramStatus?: "none" | "missing" | "uploaded";
  hasMsDiagram?: boolean;
  msDiagramUrl?: string;
  msDiagramStatus?: "none" | "missing" | "uploaded";
  status?: "complete" | "incomplete";
  notes?: string;
  tags?: string[];
  aiTagConfidence?: number;
};

export type PlatformQuestionPayload = {
  subject: string;
  subjectId?: string;
  subjectCode?: string;
  grade?: string;
  componentId?: string;
  topic: string;
  subtopic?: string;
  difficulty: 1 | 2 | 3;
  questionFormat?: "mcq" | "written";
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  answerText?: string;
  explanation?: string;
  marks?: number;
  hasDiagram?: boolean;
  diagramUrl?: string;
  accessPolicy?: "private" | "shared_with_instructors" | "public";
  tags?: string[];
  isActive?: boolean;
  batchId?: string;
  batchClassId?: string;
  subjectModuleId?: string;
  subjectLessonId?: string;
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
};

export const platformQuestionsService = {
  list(query: string) {
    return apiFetch(`/api/platform-questions?${query}`);
  },

  subjects() {
    return apiFetch("/api/platform-questions/subjects");
  },

  pastPaperStats() {
    return apiFetch("/api/platform-questions/pastpaper-stats");
  },

  testYourselfSummary() {
    return apiFetch("/api/platform-questions/test-yourself-summary");
  },

  curriculumOptions(subject: string) {
    const params = new URLSearchParams({ subject });
    return apiFetch(`/api/platform-questions/curriculum-options?${params}`);
  },

  payForAdminQbAccess(body?: {
    accessRequestId?: string;
    scopeType?: "full" | "subject" | "topics";
    topics?: string[];
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    grade?: string;
    note?: string;
  }) {
    return apiFetch("/api/platform-questions/access-requests/pay", {
      method: "POST",
      body: JSON.stringify(body || {}),
    });
  },

  get(id: string) {
    return apiFetch(`/api/platform-questions/${id}`);
  },

  create(body: PlatformQuestionPayload) {
    return apiFetch("/api/platform-questions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  update(id: string, body: Partial<PlatformQuestionPayload>) {
    return apiFetch(`/api/platform-questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  remove(id: string) {
    return apiFetch(`/api/platform-questions/${id}`, { method: "DELETE" });
  },

  listAccessRequests(query = "") {
    const q = query ? `?${query}` : "";
    return apiFetch(`/api/platform-questions/access-requests${q}`);
  },

  borrowCatalog(query = "") {
    const q = query ? `?${query}` : "";
    return apiFetch(`/api/platform-questions/borrow-catalog${q}`);
  },

  requestAccess(body?: {
    note?: string;
    isPaid?: boolean;
    amount?: number;
    scopeType?: "full" | "subject" | "topics";
    topics?: string[];
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    grade?: string;
  }) {
    return apiFetch("/api/platform-questions/access-requests", {
      method: "POST",
      body: JSON.stringify(body || {}),
    });
  },

  adminGrantAccess(body: {
    instructorId: string;
    scopeType?: "full" | "subject" | "topics";
    topics?: string[];
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    grade?: string;
    note?: string;
    expiresInDays?: number;
    isPaid?: boolean;
    amount?: number;
  }) {
    return apiFetch("/api/platform-questions/access-requests/grant", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patchAccessRequest(
    id: string,
    body: {
      status: "approved" | "rejected";
      note?: string;
      expiresAt?: string;
      expiresInDays?: number;
    },
  ) {
    return apiFetch(`/api/platform-questions/access-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  generateFromText(body: {
    text: string;
    subject?: string;
    subjectId?: string;
    subjectCode?: string;
    grade?: string;
    topic?: string;
    componentId?: string;
  }) {
    return apiFetch("/api/platform-questions/generate", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  generateFromPdf(body: {
    pdfPublicId: string;
    subject?: string;
    subjectId?: string;
    subjectCode?: string;
    grade?: string;
    topic?: string;
    componentId?: string;
  }) {
    return apiFetch("/api/platform-questions/generate", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async uploadPdf(file: File, folder = "lms/platform-question-bank") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("description", "Platform QB AI source");
    const res = await fetch("/api/upload/pdf", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    return res;
  },

  saveGeneratedBatch(body: {
    questions: GeneratedQuestionDraft[];
    subject?: string;
    subjectId?: string;
    subjectCode?: string;
    grade?: string;
    topic?: string;
    componentId?: string;
    accessPolicy?: PlatformQuestionPayload["accessPolicy"];
    sourceType?: "claude" | "pdf";
    sourcePdfPublicId?: string;
    sourcePdfUrl?: string;
  }) {
    return apiFetch("/api/platform-questions/generate", {
      method: "POST",
      body: JSON.stringify({ save: true, ...body }),
    });
  },

  processPastPaper(body: {
    qpPublicId: string;
    msPublicId: string;
    paperCode?: string;
    qpFilename?: string;
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    grade?: string;
  }) {
    return apiFetch("/api/platform-questions/process-pastpaper", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  savePastPaperBatch(body: {
    questions: PastPaperQuestionDraftPayload[];
    qpPublicId?: string;
    msPublicId?: string;
    accessPolicy?: PlatformQuestionPayload["accessPolicy"];
  }) {
    return apiFetch("/api/platform-questions/process-pastpaper", {
      method: "POST",
      body: JSON.stringify({ save: true, ...body }),
    });
  },

  async uploadDiagram(id: string, file: File, target: "qp" | "ms" = "qp") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target", target);
    return fetch(`/api/platform-questions/${id}/diagram`, {
      method: "PATCH",
      body: formData,
      credentials: "include",
    });
  },

  /** Upload master-format XLSX/CSV or Google Sheet into Platform QB (admin). */
  async importSheet(formData: FormData) {
    return fetch("/api/platform-questions/import", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  },

  convertToMcq(id: string) {
    return apiFetch(`/api/platform-questions/${id}/convert-mcq`, {
      method: "POST",
    });
  },
};
