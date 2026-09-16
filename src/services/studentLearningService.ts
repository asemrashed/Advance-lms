import {
  getMyEnrollments,
  type MyEnrollmentRow,
} from "@/lib/api/enrollmentClient";
import {
  getMyProgress,
  markLessonComplete,
  type CourseProgressRow,
} from "@/lib/api/progressClient";

const ALLOWED_ENROLLMENT_STATUSES = new Set(["completed", "enrolled", "in_progress", "suspended"]);

export type StudentCourseBundleChapter = {
  _id: string;
  title: string;
  description?: string;
  order?: number;
  topicDriveUrl?: string;
  batchId?: string;
  isPublished?: boolean;
};

export type StudentCourseBundleLesson = {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  chapter: string;
  course?: string;
  order?: number;
  duration?: number;
  lessonType?: string;
  youtubeVideoId?: string;
  videoUrl?: string;
  video?: string;
  pdfUrl?: string;
  attachments?: Array<{ name: string; url: string; type?: string }>;
  liveClassId?: string;
  liveClass?: {
    _id: string;
    title?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    meetLink?: string;
    recordingUrl?: string;
    type?: "live" | "recorded";
  };
  worksheet?: {
    _id: string;
    title: string;
  };
  worksheets?: Array<{
    _id: string;
    title: string;
  }>;
  assignments?: Array<{
    _id: string;
    title: string;
    type?: string;
    totalMarks?: number;
    dueDate?: string;
  }>;
  updatedAt?: string;
  isPublished?: boolean;
  isFree?: boolean;
};

export type StudentCourseBundleTest = {
  _id: string;
  title: string;
  description?: string;
  chapter: string;
  lesson?: string;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  publishedAt?: string;
};

export type StudentCourseBundle = {
  course: {
    _id: string;
    title?: string;
    category?: string;
    subjectName?: string;
    instructor?: string | { _id?: string; name?: string };
    createdBy?: string | { _id?: string; name?: string };
    [key: string]: unknown;
  };
  chapters: StudentCourseBundleChapter[];
  lessons: StudentCourseBundleLesson[];
  tests: StudentCourseBundleTest[];
};

const normalizeCourseId = (course: unknown): string => {
  if (course && typeof course === "object") {
    return String((course as { _id?: unknown })._id ?? "");
  }
  return String(course ?? "");
};

export const studentLearningService = {
  async getMyCourses() {
    const res = await fetch("/api/student/my-courses");
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to load courses");
    }
    return data.data as {
      overview: {
        recordedCount: number;
        liveBatchCount: number;
        liveCourseCount: number;
        completedCount: number;
        averageProgress: number;
        hasLive: boolean;
      };
      recorded: Array<{
        _id: string;
        courseId: string;
        enrolledAt: string;
        status: string;
        progress: number;
        paymentStatus: string;
        courseLuInfo?: {
          _id: string;
          title: string;
          description?: string;
          thumbnailUrl?: string;
          category?: string;
          isPaid: boolean;
          courseType: string;
        };
      }>;
      live: Array<{
        courseId: string;
        courseTitle: string;
        subject?: string;
        thumbnailUrl?: string;
        shortDescription?: string;
        batches: Array<{
          enrollmentId: string;
          batchId: string;
          batchName: string;
          grade: string;
          enrolledAt: string;
          startDate?: string;
          endDate?: string;
        }>;
      }>;
    };
  },

  async getEnrollmentsWithProgress(page: number, limit: number) {
    const [enrollmentRes, progressRes] = await Promise.all([
      getMyEnrollments(),
      getMyProgress(),
    ]);

    const progressByCourse = new Map<string, number>();
    for (const row of progressRes.data.progress) {
      const courseId = normalizeCourseId(row.course);
      if (!courseId) continue;
      progressByCourse.set(courseId, Number(row.progressPercentage || 0));
    }
    
    const filtered = enrollmentRes.data.enrollments
      .filter((enrollment) => ALLOWED_ENROLLMENT_STATUSES.has(String(enrollment.status || "").toLowerCase()))
      .map((enrollment) => {
        const courseId = normalizeCourseId(enrollment.courseLuInfo?._id || enrollment.course);
        const progressPercentage = progressByCourse.get(courseId);
        return {
          ...enrollment,
          progress: typeof progressPercentage === "number" ? progressPercentage : Number(enrollment.progress || 0),
        };
      });
    const safeLimit = Math.max(1, limit);
    const safePage = Math.max(1, page);
    const total = filtered.length;
    const pages = total > 0 ? Math.ceil(total / safeLimit) : 0;
    const boundedPage = pages > 0 ? Math.min(safePage, pages) : 1;
    const startIndex = (boundedPage - 1) * safeLimit;

    return {
      enrollments: filtered.slice(startIndex, startIndex + safeLimit),
      pagination: {
        page: boundedPage,
        limit: safeLimit,
        total,
        pages,
      },
    };
  },

  async getCourseBundle(
    courseId: string,
    options?: { batchId?: string },
  ): Promise<StudentCourseBundle> {
    const batchId = options?.batchId?.trim();
    const params = new URLSearchParams();
    if (batchId) params.set("batchId", batchId);
    const qs = params.toString();
    const res = await fetch(
      `/api/student/courses/${encodeURIComponent(courseId)}/curriculum${
        qs ? `?${qs}` : ""
      }`,
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to load course curriculum");
    }

    const chapters = (data.data.chapters || []) as StudentCourseBundleChapter[];
    const lessons = ((data.data.lessons || []) as Array<
      Record<string, unknown>
    >).map((lesson) => {
      const chapter = lesson.chapter;
      return {
        ...(lesson as Omit<StudentCourseBundleLesson, "chapter">),
        chapter:
          chapter && typeof chapter === "object"
            ? String((chapter as { _id?: unknown })._id || "")
            : String(chapter || ""),
      } satisfies StudentCourseBundleLesson;
    });
    const tests = (data.data.tests || []) as StudentCourseBundleTest[];

    return {
      course: data.data.course as StudentCourseBundle["course"],
      chapters,
      lessons,
      tests,
    };
  },

  getProgress() {
    return getMyProgress();
  },

  completeLesson(courseId: string, lessonId: string) {
    return markLessonComplete(courseId, lessonId);
  },

  async getCourseEnrollment(courseId: string): Promise<MyEnrollmentRow | null> {
    const enrollmentRes = await getMyEnrollments();
    const normalizedCourseId = String(courseId);
    return (
      enrollmentRes.data.enrollments.find((enrollment) => {
        const rowCourseId = normalizeCourseId(enrollment.courseLuInfo?._id || enrollment.course);
        return rowCourseId === normalizedCourseId;
      }) ?? null
    );
  },

  findProgressForCourse(progressRows: CourseProgressRow[], courseId: string) {
    const targetId = String(courseId);
    return progressRows.find((row) => normalizeCourseId(row.course) === targetId) ?? null;
  },
};
