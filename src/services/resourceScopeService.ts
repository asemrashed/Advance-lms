import { apiFetch } from "@/lib/api/httpClient";
import { formatCourseOptionLabel } from "@/lib/courseLabel";

type Option = { _id: string; label: string; grade?: string; subjectName?: string };

function mapCourse(row: Record<string, unknown>): Option {
  const title = String(row.title ?? row._id);
  const subjectName =
    typeof row.subjectName === "string" ? row.subjectName : undefined;
  const grade = typeof row.grade === "string" ? row.grade : undefined;
  return {
    _id: String(row._id),
    label: formatCourseOptionLabel({ title, subjectName, grade }),
    grade,
    subjectName,
  };
}

function mapBatch(row: Record<string, unknown>): Option {
  return {
    _id: String(row._id),
    label: String(row.name ?? row.subject ?? row._id),
  };
}

export const resourceScopeService = {
  async listCourses(courseKind: "live" | "recorded") {
    const courseType = courseKind === "live" ? "live" : "recorded";
    const res = await apiFetch(
      `/api/courses?limit=200&courseType=${courseType}`,
    );
    const json = (await res.json()) as {
      data?: { courses?: Record<string, unknown>[] };
    };
    const rows = json.data?.courses ?? [];
    return rows.map(mapCourse);
  },

  async listBatchesForCourse(courseId: string) {
    const res = await apiFetch(
      `/api/courses/${encodeURIComponent(courseId)}/batches`,
    );
    const json = (await res.json()) as {
      data?: { batches?: Record<string, unknown>[] };
    };
    const rows = json.data?.batches ?? [];
    return rows.map(mapBatch);
  },

  async listChapters(courseId: string) {
    const params = new URLSearchParams({
      course: courseId,
      limit: "100",
      sortBy: "createdAt",
      sortOrder: "asc",
    });
    const res = await apiFetch(`/api/chapters?${params.toString()}`);
    const json = (await res.json()) as {
      data?: { chapters?: Record<string, unknown>[] };
    };
    const rows = (json.data?.chapters ?? []).filter(
      (row) => !row.batchId,
    );
    return rows.map((row) => ({
      _id: String(row._id),
      label: String(row.title ?? row._id),
    }));
  },

  async listLessons(chapterId: string) {
    const res = await apiFetch(
      `/api/lessons?chapter=${encodeURIComponent(chapterId)}&limit=100`,
    );
    const json = (await res.json()) as {
      data?: { lessons?: Record<string, unknown>[] };
    };
    const rows = json.data?.lessons ?? [];
    return rows.map((row) => ({
      _id: String(row._id),
      label: String(row.title ?? row._id),
    }));
  },

  async listCourseTopics(courseId: string) {
    const chapters = await this.listChapters(courseId);
    const topics: {
      lessonId: string;
      chapterId: string;
      topic: string;
      label: string;
    }[] = [];

    for (const chapter of chapters) {
      const lessons = await this.listLessons(chapter._id);
      for (const lesson of lessons) {
        topics.push({
          lessonId: lesson._id,
          chapterId: chapter._id,
          topic: lesson.label,
          label: `${chapter.label} · ${lesson.label}`,
        });
      }
    }

    return topics;
  },
};

export type BatchModuleOption = {
  _id: string;
  label: string;
  lessons: { _id: string; title: string }[];
};
