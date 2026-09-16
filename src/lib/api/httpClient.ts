/**
 * Central fetch wrapper for authenticated API calls from services.
 */
export async function apiFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const body = init?.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (
    !isFormData &&
    body != null &&
    typeof body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    credentials: "include",
    cache: init?.cache ?? "no-store",
    ...init,
    headers,
  });
}
