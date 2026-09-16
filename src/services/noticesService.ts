import { apiFetch } from "@/lib/api/httpClient";
import type { CreateNoticeDto, NoticeRow, UpdateNoticeDto } from "@/types/notice";

type ListEnvelope = {
  success?: boolean;
  data?: {
    notices?: NoticeRow[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
};

type NoticeEnvelope = {
  success?: boolean;
  data?: { notice?: NoticeRow };
  error?: string;
};

export const noticesService = {
  async list(query = "limit=20&page=1") {
    const res = await apiFetch(`/api/notices?${query}`);
    const json = (await res.json()) as ListEnvelope;
    return {
      res,
      notices: json.data?.notices ?? [],
      pagination: json.data?.pagination,
      error: json.error,
    };
  },

  async get(id: string) {
    const res = await apiFetch(`/api/notices/${id}`);
    const json = (await res.json()) as NoticeEnvelope;
    return { res, notice: json.data?.notice, error: json.error };
  },

  async create(body: CreateNoticeDto) {
    const res = await apiFetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as NoticeEnvelope;
    return { res, notice: json.data?.notice, error: json.error };
  },

  async update(id: string, body: UpdateNoticeDto) {
    const res = await apiFetch(`/api/notices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as NoticeEnvelope;
    return { res, notice: json.data?.notice, error: json.error };
  },

  async remove(id: string) {
    const res = await apiFetch(`/api/notices/${id}`, { method: "DELETE" });
    return res.ok;
  },
};
