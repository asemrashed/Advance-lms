import type { PublicBatchRow } from "@/app/api/_lib/mapPublicBatch";

export type { PublicBatchRow };

export type PublicBatchRoutineDay = {
  dayOfWeek: number;
  label: string;
  slots: { dayOfWeek: number; startTime: string; endTime: string; title?: string }[];
};

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export const publicBatchesService = {
  async listBatches(params?: {
    search?: string;
    page?: number;
    limit?: number;
    courseId?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.courseId) q.set("courseId", params.courseId);
    const suffix = q.toString() ? `?${q}` : "";
    const res = await fetch(`/api/public/batches${suffix}`, { cache: "no-store" });
    return parseJson<{
      success: boolean;
      data?: {
        batches: PublicBatchRow[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
      error?: string;
    }>(res);
  },

  async getBatch(id: string) {
    const res = await fetch(`/api/public/batches/${id}`, { cache: "no-store" });
    return parseJson<{
      success: boolean;
      data?: {
        batch: PublicBatchRow;
        routine: PublicBatchRoutineDay[];
      };
      error?: string;
    }>(res);
  },
};
