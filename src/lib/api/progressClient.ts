import { API_ENDPOINTS } from "./endpoints";

export type CourseProgressRow = {
  _id: string;
  student: string;
  course:
    | string
    | {
        _id: string;
        title?: string;
        shortDescription?: string;
        thumbnailUrl?: string;
        category?: string;
        isPaid?: boolean;
        price?: number;
        status?: string;
      };
  lessonProgress: Array<{
    lesson: string;
    completed: boolean;
    completedAt?: string;
  }>;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  status: "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
};

type GetProgressResponse = {
  success: true;
  data: { progress: CourseProgressRow[] };
};

type MarkLessonCompleteResponse = {
  success: true;
  data: CourseProgressRow;
};

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorFromBody(status: number, body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  return `Request failed (${status})`;
}

export async function getMyProgress(): Promise<GetProgressResponse> {
  const response = await fetch(API_ENDPOINTS.PROGRESS, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(errorFromBody(response.status, body));
  }
  if (
    !body ||
    typeof body !== "object" ||
    (body as { success?: unknown }).success !== true ||
    !Array.isArray((body as { data?: { progress?: unknown } }).data?.progress)
  ) {
    throw new Error("Invalid progress response");
  }
  return body as GetProgressResponse;
}

export async function markLessonComplete(
  courseId: string,
  lessonId: string,
): Promise<MarkLessonCompleteResponse> {
  const response = await fetch(API_ENDPOINTS.PROGRESS, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ courseId: courseId.trim(), lessonId: lessonId.trim() }),
    cache: "no-store",
  });
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(errorFromBody(response.status, body));
  }
  if (
    !body ||
    typeof body !== "object" ||
    (body as { success?: unknown }).success !== true ||
    !(body as { data?: unknown }).data
  ) {
    throw new Error("Invalid mark-complete response");
  }
  return body as MarkLessonCompleteResponse;
}
