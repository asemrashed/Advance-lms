import { API_ENDPOINTS } from "./endpoints";

/** Populated course summary on enrollment rows from real API. */
export type EnrollmentCourseLuInfo = {
  _id: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  price?: number;
  category?: string;
  isPaid?: boolean;
};

/** Single enrollment from `GET /api/enrollments` / `POST /api/enrollments`. */
export type MyEnrollmentRow = {
  _id: string;
  student: string;
  course: string;
  selectedBatchId?: string;
  batchId?: string;
  batchName?: string;
  enrolledAt: string;
  status: string;
  progress: number;
  lastAccessedAt?: string;
  completedAt?: string;
  droppedAt?: string;
  suspendedAt?: string;
  paymentStatus: string;
  paymentAmount?: number;
  paymentMethod?: string;
  paymentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  courseLuInfo?: EnrollmentCourseLuInfo;
};

export type MyEnrollmentsSuccessBody = {
  success: true;
  data: { enrollments: MyEnrollmentRow[] };
};

export type CreateEnrollmentSuccessBody = {
  success: true;
  data: MyEnrollmentRow;
};

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function authErrorMessage(status: number, body: unknown): string {
  if (status === 401) return "Authentication required";
  if (status === 403) return "Forbidden";
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

/**
 * `POST /api/enrollments` — session user enrolls in `course` (Mongo id).
 * Never sends user id; server uses `session.user.id` only.
 */
export async function createEnrollment(
  courseId: string,
): Promise<CreateEnrollmentSuccessBody> {
  const trimmed = courseId.trim();
  const response = await fetch(API_ENDPOINTS.ENROLLMENTS, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ course: trimmed }),
    cache: "no-store",
  });

  const body = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(authErrorMessage(response.status, body));
  }

  if (
    !body ||
    typeof body !== "object" ||
    (body as { success?: unknown }).success !== true ||
    !(body as { data?: unknown }).data
  ) {
    throw new Error("Invalid enrollment response");
  }

  return body as CreateEnrollmentSuccessBody;
}

/** `GET /api/enrollments` — current user's enrollments (requires session cookie). */
export async function getMyEnrollments(): Promise<MyEnrollmentsSuccessBody> {
  const response = await fetch(API_ENDPOINTS.ENROLLMENTS, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const body = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(authErrorMessage(response.status, body));
  }

  if (
    !body ||
    typeof body !== "object" ||
    (body as { success?: unknown }).success !== true
  ) {
    throw new Error("Invalid enrollments response");
  }

  const data = (body as { data?: { enrollments?: unknown } }).data;
  if (!data || !Array.isArray(data.enrollments)) {
    throw new Error("Invalid enrollments payload shape");
  }

  return body as MyEnrollmentsSuccessBody;
}
