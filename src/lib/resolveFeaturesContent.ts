import {
  defaultFeaturesContent,
  type WebsiteContent,
} from "@/lib/websiteContentDefaults";
import type { FeaturesContent } from "@/lib/websiteContentTypes";

/** Merge CMS features with defaults (home + about). */
export function resolveFeaturesContent(
  cms: WebsiteContent | null | undefined,
): FeaturesContent {
  const raw = cms?.features;
  const items =
    raw?.features && raw.features.length > 0
      ? raw.features
      : defaultFeaturesContent.features;

  return {
    ...defaultFeaturesContent,
    ...raw,
    sectionHeading:
      raw?.sectionHeading?.trim() || defaultFeaturesContent.sectionHeading,
    sectionSubtitle:
      raw?.sectionSubtitle?.trim() || defaultFeaturesContent.sectionSubtitle,
    image: raw?.image?.trim() || defaultFeaturesContent.image,
    features: items,
  };
}
