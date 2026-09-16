import { API_ENDPOINTS } from "./endpoints";
import type { PastPapersListBody } from "@/types/pastPaper";

export type PastPapersQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function getPastPapers(
  query: PastPapersQuery = {},
): Promise<PastPapersListBody> {
  const searchParams = new URLSearchParams();
  if (query.page != null) searchParams.set("page", String(query.page));
  if (query.limit != null) searchParams.set("limit", String(query.limit));
  if (query.search) searchParams.set("search", query.search);

  const url = searchParams.toString()
    ? `${API_ENDPOINTS.PAST_PAPERS}?${searchParams.toString()}`
    : API_ENDPOINTS.PAST_PAPERS;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as {
    success?: boolean;
    data?: { pastPapers?: PastPapersListBody["pastPapers"] };
    error?: string;
  };

  if (!response.ok || json?.success !== true) {
    throw new Error(json?.error || "Failed to load past papers");
  }

  const pastPapers = Array.isArray(json?.data?.pastPapers)
    ? json.data.pastPapers
    : [];

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const total = pastPapers.length;

  return {
    pastPapers,
    pagination: {
      page,
      limit,
      total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}
