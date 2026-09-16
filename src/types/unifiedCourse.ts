/** Recorded = self-paced enrollment on course; live = batch-only enrollment. */
export type CourseType = "recorded" | "live";

export type LessonType = "recorded" | "pdf" | "text" | "live";

export type CourseAnnouncementStatus = "draft" | "published" | "archived";

export interface CurriculumLessonSuggestion {
  title: string;
  order: number;
  lessonType: LessonType;
  /** Source lesson id (present for course→course copy suggestions). */
  lessonId?: string;
}

export interface CurriculumChapterSuggestion {
  title: string;
  order: number;
  description?: string;
  lessons: CurriculumLessonSuggestion[];
  /** Source chapter id (present for course→course copy suggestions). */
  chapterId?: string;
}

export interface CurriculumSuggestionsResponse {
  sourceBatchId: string;
  targetBatchId: string;
  chapters: CurriculumChapterSuggestion[];
}

export interface CourseAnnouncement {
  _id: string;
  courseId: string;
  title: string;
  body: string;
  /** When set, instructor plans an optional live session. */
  liveSessionAt?: string;
  liveSessionLink?: string;
  status: CourseAnnouncementStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
