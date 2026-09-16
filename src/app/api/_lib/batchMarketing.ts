import { normalizeBatchGrade } from "@/lib/batchGrades";
import { imageUrlError } from "@/lib/imageUrl";

export function parseFeaturesInput(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
}

export function parseBatchMarketingBody(body: Record<string, unknown>) {
  const thumbnailUrl =
    typeof body.thumbnailUrl === "string" ? body.thumbnailUrl.trim() : "";
  const shortDescription =
    typeof body.shortDescription === "string" ? body.shortDescription.trim() : "";
  const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl.trim() : "";
  const grade = normalizeBatchGrade(body.grade ?? body.category);
  const description =
    typeof body.description === "string" ? body.description.trim() : undefined;
  const features = parseFeaturesInput(body.features);

  return {
    thumbnailUrl,
    shortDescription,
    videoUrl: videoUrl || undefined,
    grade,
    description,
    features,
  };
}

export function validateBatchMarketingForCreate(marketing: {
  thumbnailUrl?: string;
  shortDescription: string;
  name?: string;
  fee?: number;
}) {
  const errors: string[] = [];
  if (!marketing.name?.trim()) errors.push("Title is required");
  if (!marketing.shortDescription) errors.push("Short description is required");
  const thumbError = imageUrlError(marketing.thumbnailUrl || "");
  if (thumbError) errors.push(thumbError);
  return errors;
}
