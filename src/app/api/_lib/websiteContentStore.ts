import connectDB from "@/lib/mongodb";
import Settings from "@/models/Settings";
import SiteContent from "@/models/SiteContent";
import {
  WEBSITE_CONTENT_CATEGORY,
  defaultWebsiteContent,
  normalizeLegacyBrandNames,
  sanitizeWebsiteContentForSave,
  stripLegacyWebsiteContentKeys,
} from "@/lib/websiteContentDefaults";
import { mergeEditorialHeroIntoSettings } from "@/lib/mergeHeroContent";

const SITE_CONTENT_KEY = WEBSITE_CONTENT_CATEGORY;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return null;
}

async function loadLegacySettingsContent() {
  const legacyDoc = await Settings.findOne({ category: WEBSITE_CONTENT_CATEGORY }).lean();
  return asRecord(legacyDoc?.settings);
}

export async function loadWebsiteContentSettings(): Promise<Record<string, unknown>> {
  await connectDB();

  const siteContentDoc = await SiteContent.findOne({ key: SITE_CONTENT_KEY }).lean();
  const siteContent = asRecord(siteContentDoc?.content);
  if (siteContent) return stripLegacyWebsiteContentKeys(siteContent);

  const legacyContent = await loadLegacySettingsContent();
  if (legacyContent) return stripLegacyWebsiteContentKeys(legacyContent);

  return stripLegacyWebsiteContentKeys({ ...defaultWebsiteContent });
}

export async function saveWebsiteContentSettings(
  settings: Record<string, unknown>,
  updatedBy?: string,
) {
  await connectDB();
  const update: Record<string, unknown> = {
    key: SITE_CONTENT_KEY,
    content: settings,
  };
  if (updatedBy) {
    update.updatedBy = updatedBy;
  }

  const result = await SiteContent.findOneAndUpdate(
    { key: SITE_CONTENT_KEY },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return asRecord(result?.content) ?? settings;
}

export async function hasWebsiteContentDocument() {
  await connectDB();
  return Boolean(await SiteContent.exists({ key: SITE_CONTENT_KEY }));
}

/** Persist AdvanceLMS branding over legacy EduPlatform / CodeZyne CMS values. */
export async function migrateRebrandToNasmatics(updatedBy?: string) {
  const current = await loadWebsiteContentSettings();
  const normalized = normalizeLegacyBrandNames(current);
  return saveWebsiteContentSettings(
    sanitizeWebsiteContentForSave(normalized),
    updatedBy,
  );
}

/** Merge editorial AdvanceLMS hero fields into persisted CMS content. */
export async function migrateEditorialHeroContent(updatedBy?: string) {
  const current = await loadWebsiteContentSettings();
  const merged = mergeEditorialHeroIntoSettings(current);
  return saveWebsiteContentSettings(
    sanitizeWebsiteContentForSave(merged),
    updatedBy,
  );
}
