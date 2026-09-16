import { API_ENDPOINTS } from "@/lib/api/endpoints";

export async function fetchAccountProfile(): Promise<Response> {
  return fetch(API_ENDPOINTS.ACCOUNT_PROFILE, {
    credentials: "include",
    cache: "no-store",
  });
}

export async function putAccountProfile(body: Record<string, unknown>): Promise<Response> {
  return fetch(API_ENDPOINTS.ACCOUNT_PROFILE, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function postAccountChangePassword(body: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<Response> {
  return fetch(API_ENDPOINTS.ACCOUNT_CHANGE_PASSWORD, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
