export type TestYourselfTestRow = {
  _id: string;
  subject: string;
  topic: string;
  name: string;
  grade?: string;
  freeQuestionLimit: number;
  enrolledQuestionLimit: number;
  isPublished: boolean;
  isActive: boolean;
  questionCount: number;
  courseId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateTestYourselfTestDto = {
  subject: string;
  subjectId?: string;
  subjectCode?: string;
  grade?: string;
  topic?: string;
  name?: string;
  freeQuestionLimit?: number;
  enrolledQuestionLimit?: number;
  courseId?: string;
};

export type UpdateTestYourselfTestDto = {
  subject?: string;
  topic?: string;
  name?: string;
  freeQuestionLimit?: number;
  enrolledQuestionLimit?: number;
  isPublished?: boolean;
  isActive?: boolean;
  courseId?: string | null;
};
