import type { ResourceScopePayload, ResourceScopeValue } from "@/types/resourceScope";

export type ResourceWorksheetAccessPolicy = "public" | "batch";
export type ResourceWorksheetSourceType = "upload" | "course_qb";
export type ResourceWorksheetFileType = "worksheet" | "marks_pdf";

export type ResourceWorksheetRow = ResourceScopeValue & {
  _id: string;
  subjectId?: string;
  subjectCode?: string;
  title: string;
  subject: string;
  topic: string;
  grade?: string;
  scopeType?: "batch" | "course" | "subject";
  pdfUrl?: string;
  pdfPublicId?: string;
  marksPdfUrl?: string;
  marksPdfPublicId?: string;
  hasWorksheetPdf?: boolean;
  hasMarksPdf?: boolean;
  sourceType?: ResourceWorksheetSourceType;
  questionIds?: string[];
  description?: string;
  isActive: boolean;
  accessPolicy: ResourceWorksheetAccessPolicy;
  canDownload?: boolean;
  uploadedBy?: string | { _id: string; name?: string; email?: string };
  batchId?: string;
  batch?: { _id: string; name?: string };
  batchClass?: { _id: string; title?: string };
  subjectModule?: { _id: string; title?: string };
  subjectLesson?: { _id: string; title?: string };
  course?: { _id: string; title?: string };
  chapter?: { _id: string; title?: string };
  lesson?: { _id: string; title?: string };
  createdAt?: string;
  updatedAt?: string;
};

export type CreateResourceWorksheetDto = Partial<Omit<ResourceScopePayload, "scopeType">> & {
  scopeType?: "batch" | "course" | "subject";
  subjectId?: string;
  subject?: string;
  subjectCode?: string;
  chapter?: string;
  title: string;
  pdfUrl: string;
  pdfPublicId?: string;
  marksPdfUrl?: string;
  marksPdfPublicId?: string;
  description?: string;
  isActive?: boolean;
  accessPolicy?: ResourceWorksheetAccessPolicy;
};

export type UpdateResourceWorksheetDto = Partial<CreateResourceWorksheetDto> & {
  questionIds?: string[];
  includeAnswers?: boolean;
  /** When true (or when questionIds are sent for a QB worksheet), rebuild the PDF. */
  regenerateFromQuestions?: boolean;
};

export type GenerateResourceWorksheetDto = Partial<Omit<ResourceScopePayload, "scopeType">> & {
  scopeType?: "batch" | "course" | "subject";
  subjectId?: string;
  subject?: string;
  subjectCode?: string;
  chapter?: string;
  title: string;
  questionIds: string[];
  includeAnswers?: boolean;
  description?: string;
  isActive?: boolean;
  accessPolicy?: ResourceWorksheetAccessPolicy;
};
