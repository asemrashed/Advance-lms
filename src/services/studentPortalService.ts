import { apiFetch } from "@/lib/api/httpClient";

export const studentPortalService = {
  getSchedule(query: string) {
    return apiFetch(`/api/student/schedule?${query}`);
  },

  getAttendance(query = "limit=500") {
    return apiFetch(`/api/student/attendance?${query}`);
  },
};
