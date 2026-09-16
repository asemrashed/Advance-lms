import { apiFetch } from "@/lib/api/httpClient";

export const websiteContentAdminService = {
  getWebsiteContent() {
    return apiFetch("/api/admin/website-content");
  },

  saveWebsiteContent(body?: unknown, method: "POST" | "PUT" = "PUT") {
    return apiFetch("/api/admin/website-content", {
      method,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  },

  resetWebsiteContent() {
    return apiFetch("/api/admin/website-content", { method: "PUT" });
  },

  uploadBranding(formData: FormData) {
    return apiFetch("/api/upload/branding", {
      method: "POST",
      body: formData,
      headers: {},
    });
  },

  uploadCmsImage(formData: FormData) {
    return apiFetch("/api/upload/cms-image", {
      method: "POST",
      body: formData,
    });
  },
};
