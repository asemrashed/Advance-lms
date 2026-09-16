/**
 * Lesson quiz API client — wraps Phase 13.6 routes for student + staff flows.
 */

export type LessonQuizQuestion = {
  _id: string;
  lesson: string;
  course: string;
  question: string;
  options: string[];
  explanation?: string;
  isActive: boolean;
  correctOptionIndex?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type LessonQuizSubmissionSummary = {
  _id: string;
  scorePercentage: number;
  correctAnswers: number;
  totalQuestions: number;
  isPracticeMode: boolean;
  submittedAt: string;
};

export type LessonQuizResultDetails = {
  submissionId: string;
  submittedAt: string;
  scorePercentage: number;
  correctAnswers: number;
  totalQuestions: number;
  questions: Array<{
    order: number;
    questionId: string;
    question: string;
    options: string[];
    selectedIndex: number;
    correctOptionIndex: number;
    isCorrect: boolean;
    explanation: string;
  }>;
};

export type LessonQuizSubmitPayload = {
  startedAt?: string;
  answers: Array<{ questionId: string; selectedIndex: number }>;
  isPracticeMode?: boolean;
};

export type LessonQuizSubmitResult = {
  _id: string;
  score: number;
  passing: boolean;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
};

const FETCH_INIT: RequestInit = {
  credentials: "include",
  cache: "no-store",
  headers: { Accept: "application/json" },
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function apiError(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" ? data.error : fallback;
}

export async function getLessonQuizCountsByCourse(
  courseId: string,
): Promise<Record<string, number>> {
  const res = await fetch(
    `/api/lessons/quiz-availability?course=${encodeURIComponent(courseId)}`,
    { method: "GET", ...FETCH_INIT },
  );
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to load quiz availability"));
  }
  const payload = data.data as { countsByLesson?: Record<string, number> } | undefined;
  return payload?.countsByLesson ?? {};
}

export async function getSubmittedQuizLessonIds(courseId: string): Promise<string[]> {
  const res = await fetch(
    `/api/student/quiz/completion?course=${encodeURIComponent(courseId)}`,
    { method: "GET", ...FETCH_INIT },
  );
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to load quiz completion"));
  }
  const payload = data.data as { lessonIds?: string[] } | undefined;
  return Array.isArray(payload?.lessonIds) ? payload.lessonIds : [];
}

export async function getLatestLessonQuizMark(): Promise<LessonQuizSubmissionSummary | null> {
  const res = await fetch("/api/student/quiz/latest", { method: "GET", ...FETCH_INIT });
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to load latest quiz mark"));
  }
  if (!data.data || typeof data.data !== "object") return null;
  return data.data as LessonQuizSubmissionSummary;
}

export async function getLessonQuizQuestions(lessonId: string): Promise<LessonQuizQuestion[]> {
  const res = await fetch(`/api/lessons/${lessonId}/quiz`, { method: "GET", ...FETCH_INIT });
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to load quiz questions"));
  }
  return Array.isArray(data.data) ? (data.data as LessonQuizQuestion[]) : [];
}

export async function submitLessonQuiz(
  lessonId: string,
  payload: LessonQuizSubmitPayload,
): Promise<LessonQuizSubmitResult> {
  const res = await fetch(`/api/lessons/${lessonId}/quiz/submit`, {
    method: "POST",
    ...FETCH_INIT,
    headers: { ...FETCH_INIT.headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to submit quiz"));
  }
  return data.data as LessonQuizSubmitResult;
}

export async function getLessonQuizResultDetails(
  lessonId: string,
): Promise<LessonQuizResultDetails> {
  const res = await fetch(`/api/lessons/${lessonId}/quiz/result-details`, {
    method: "GET",
    ...FETCH_INIT,
  });
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to load quiz result details"));
  }
  return data.data as LessonQuizResultDetails;
}

export async function getLessonQuizHistory(
  lessonId: string,
): Promise<LessonQuizSubmissionSummary[]> {
  const res = await fetch(`/api/lessons/${lessonId}/quiz/history`, {
    method: "GET",
    ...FETCH_INIT,
  });
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to load quiz history"));
  }
  return Array.isArray(data.data) ? (data.data as LessonQuizSubmissionSummary[]) : [];
}

export async function bulkSaveLessonQuizQuestions(
  lessonId: string,
  questions: Array<{
    _id?: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
    isActive?: boolean;
  }>,
): Promise<LessonQuizQuestion[]> {
  const res = await fetch(`/api/lessons/${lessonId}/quiz/bulk`, {
    method: "POST",
    ...FETCH_INIT,
    headers: { ...FETCH_INIT.headers, "Content-Type": "application/json" },
    body: JSON.stringify({ questions }),
  });
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to save quiz questions"));
  }
  return Array.isArray(data.data) ? (data.data as LessonQuizQuestion[]) : [];
}

export async function deleteLessonQuizQuestion(questionId: string): Promise<void> {
  const res = await fetch(`/api/questions/${questionId}`, {
    method: "DELETE",
    ...FETCH_INIT,
  });
  const data = await parseJson(res);
  if (!res.ok || data.success !== true) {
    throw new Error(apiError(data, "Failed to delete question"));
  }
}
