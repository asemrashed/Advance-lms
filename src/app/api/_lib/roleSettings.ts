import mongoose from "mongoose";
import Settings from "@/models/Settings";

/** Single global document for admin UI (system, security, payment, …). */
export const ADMIN_PLATFORM_SETTINGS_CATEGORY = "admin-platform";

export function studentSettingsCategory(userId: string) {
  return `student:${userId}`;
}

export function instructorSettingsCategory(userId: string) {
  return `instructor:${userId}`;
}

export async function getSettingsRecord(category: string): Promise<Record<string, unknown>> {
  const doc = await Settings.findOne({ category }).lean();
  const raw = doc?.settings;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export async function setSettingsRecord(
  category: string,
  settings: Record<string, unknown>,
  updatedBy?: string | null,
) {
  const $set: Record<string, unknown> = { settings };
  if (updatedBy && mongoose.Types.ObjectId.isValid(updatedBy)) {
    $set.updatedBy = new mongoose.Types.ObjectId(updatedBy);
  }
  await Settings.findOneAndUpdate(
    { category },
    { $set },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export async function deleteSettingsDoc(category: string) {
  await Settings.deleteOne({ category });
}
