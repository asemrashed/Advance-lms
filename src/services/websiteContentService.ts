import { apiFetch } from "@/lib/api/httpClient";

type WebsiteContentPayload = Record<string, unknown> | null;

export const websiteContentService = {
  async getWebsiteContent(): Promise<WebsiteContentPayload> {
    const response = await apiFetch("/api/website-content");
    if (!response.ok) {
      throw new Error("Failed to fetch website content");
    }

    const data = (await response.json()) as { data?: Record<string, unknown> };
    return data?.data ?? null;
  },
};
