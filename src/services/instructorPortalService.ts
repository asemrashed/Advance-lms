import { apiFetch } from "@/lib/api/httpClient";

export const instructorPortalService = {
  getSchedule(query: string) {
    return apiFetch(`/api/instructor/schedule?${query}`);
  },
};
