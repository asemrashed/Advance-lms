/** Upload an image file; returns the public URL from the API response. */
export async function uploadImageFile(
  file: File,
  endpoint: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || "Failed to upload image",
    );
  }

  const url =
    (data as { imageUrl?: string }).imageUrl ||
    (data as { data?: { imageUrl?: string; url?: string } }).data?.imageUrl ||
    (data as { data?: { imageUrl?: string; url?: string } }).data?.url;

  if (!url || typeof url !== "string") {
    throw new Error("Upload failed: no image URL returned");
  }

  return url;
}

/** Delete a previously uploaded file from S3 / local storage (best-effort). */
export async function deleteUploadedFile(url: string): Promise<boolean> {
  const trimmed = url.trim();
  if (!trimmed) return false;

  const response = await fetch(
    `/api/upload/file?url=${encodeURIComponent(trimmed)}`,
    { method: "DELETE", credentials: "include" },
  );

  if (response.status === 404) return false;
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Failed to delete file",
    );
  }

  return true;
}

export { isManagedUploadUrl } from "@/lib/managedUploadUrl";

export const UPLOAD_ENDPOINTS = {
  courseThumbnail: "/api/upload/course-thumbnail",
  batchCover: "/api/upload/batch-cover",
  cmsImage: "/api/upload/cms-image",
} as const;
