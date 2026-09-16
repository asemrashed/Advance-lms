import { apiFetch } from "@/lib/api/httpClient";
import type {
  ResourceBrowseStats,
  ResourceCenterAccess,
} from "@/types/resourceAccess";
import type {
  CreateResourceWorksheetDto,
  GenerateResourceWorksheetDto,
  ResourceWorksheetRow,
  UpdateResourceWorksheetDto,
} from "@/types/resourceWorksheet";

export const resourceWorksheetsService = {
  async listStaff(query: string) {
    const res = await apiFetch(`/api/resource-worksheets?${query}`);
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        worksheets?: ResourceWorksheetRow[];
        subjects?: string[];
        topics?: string[];
      };
      error?: string;
    };
    return { res, json };
  },

  async generateWorksheet(payload: GenerateResourceWorksheetDto) {
    const res = await apiFetch("/api/resource-worksheets/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { worksheet?: ResourceWorksheetRow };
      error?: string;
    };
    return { res, json };
  },

  async createWorksheet(payload: CreateResourceWorksheetDto) {
    const res = await apiFetch("/api/resource-worksheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { worksheet?: ResourceWorksheetRow };
      error?: string;
    };
    return { res, json };
  },

  async updateWorksheet(id: string, payload: UpdateResourceWorksheetDto) {
    const res = await apiFetch(`/api/resource-worksheets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { worksheet?: ResourceWorksheetRow };
      error?: string;
    };
    return { res, json };
  },

  async deleteWorksheet(id: string) {
    const res = await apiFetch(`/api/resource-worksheets/${id}`, { method: "DELETE" });
    const json = (await res.json()) as { success?: boolean; error?: string };
    return { res, json };
  },

  async browsePublic(query = "") {
    const suffix = query ? `?${query}` : "";
    const res = await apiFetch(`/api/public/resource-worksheets${suffix}`);
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        worksheets?: ResourceWorksheetRow[];
        subjects?: string[];
        topics?: string[];
        access?: ResourceCenterAccess;
        stats?: ResourceBrowseStats;
      };
      error?: string;
    };
    return { res, json };
  },

  downloadHref(worksheetId: string, type: "worksheet" | "marks_pdf" = "worksheet") {
    return `/api/resource-worksheets/${worksheetId}/download?type=${type}`;
  },

  async fetchViewUrl(
    worksheetId: string,
    type: "worksheet" | "marks_pdf" = "worksheet",
  ) {
    const res = await apiFetch(
      `/api/resource-worksheets/${worksheetId}/view?type=${type}`,
    );
    const json = (await res.json()) as {
      success?: boolean;
      data?: { url?: string };
      error?: string;
    };
    return { res, json };
  },
};
