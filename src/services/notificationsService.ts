import { apiFetch } from "@/lib/api/httpClient";
import type { InAppNotificationRow } from "@/types/inAppNotification";

type ListEnvelope = {
  success?: boolean;
  data?: {
    notifications?: InAppNotificationRow[];
    unreadCount?: number;
  };
  error?: string;
};

export const notificationsService = {
  async list(options?: {
    unreadOnly?: boolean;
    limit?: number;
    type?: string;
    excludeType?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.set("unread", "true");
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.type) params.set("type", options.type);
    if (options?.excludeType) params.set("excludeType", options.excludeType);
    const qs = params.toString();
    const res = await apiFetch(`/api/notifications${qs ? `?${qs}` : ""}`);
    const json = (await res.json()) as ListEnvelope;
    return {
      res,
      notifications: json.data?.notifications ?? [],
      unreadCount: json.data?.unreadCount ?? 0,
    };
  },

  async markRead(id: string) {
    const res = await apiFetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
    return res.ok;
  },

  async markAllRead() {
    const res = await apiFetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
    return res.ok;
  },
};
