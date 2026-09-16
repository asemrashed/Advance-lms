export type TestYourselfOption = {
  index: number;
  text: string;
};

export type TestYourselfQuestion = {
  _id: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: 1 | 2 | 3;
  questionFormat: "mcq" | "written";
  questionText: string;
  hasDiagram: boolean;
  diagramUrl?: string;
  options: TestYourselfOption[];
  answerText?: string;
  msText?: string;
  marks?: number;
  accessPolicy?: string;
};

export type TestYourselfTopicOption = {
  topic: string;
  name: string;
  questionCount: number;
};

export type TestYourselfSubjectCard = {
  subject: string;
  name: string;
  grade?: string;
  questionCount: number;
  topicCount: number;
  freeLimit: number;
  enrolledLimit: number;
  courseId?: string;
  topics: TestYourselfTopicOption[];
};

/** @deprecated Prefer TestYourselfSubjectCard — kept for staff/legacy. */
export type TestYourselfTopic = {
  subject: string;
  topic: string;
  name: string;
  questionCount: number;
  previewCount: number;
  lockedCount: number;
  freeLimit?: number;
  enrolledLimit?: number;
  courseId?: string;
};

export type TestYourselfAccess = {
  fullAccess: boolean;
  freeLimit: number;
  enrolledLimit: number;
  sampleSize: number;
  poolSize: number;
  total: number;
  lockedCount: number;
};

export type TestYourselfAnswerInput = {
  questionId: string;
  optionIndex?: number;
  textAnswer?: string;
};

export type TestYourselfCheckResult = {
  questionId: string;
  correct: boolean;
  selectedIndex?: number;
  correctIndex: number;
  selectedText?: string;
  questionFormat?: "mcq" | "written";
  selfCheck?: boolean;
  answerText?: string;
  msText?: string;
  explanation?: string;
};

export type TestYourselfAttemptMode = "full" | "topic";

export type TestYourselfAttemptRow = {
  _id: string;
  subject: string;
  topic?: string;
  mode: TestYourselfAttemptMode;
  difficulty?: number;
  score: number;
  total: number;
  fullAccess: boolean;
  createdAt: string;
};
