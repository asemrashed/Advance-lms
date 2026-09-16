import type { WebsiteContent } from "@/lib/websiteContentDefaults";
import { isHomeSectionEnabled } from "@/lib/navSectionVisibility";

/** Recorded-course catalog visibility — synced with CMS Featured Courses section. */
export function isRecordedCoursesEnabled(
  content?: Pick<WebsiteContent, "sectionOrder" | "studentPortal"> | Record<string, unknown> | null,
): boolean {
  const sectionOrder = content?.sectionOrder as WebsiteContent["sectionOrder"] | undefined;
  return isHomeSectionEnabled("courses", sectionOrder);
}

/** Live enrollment catalog visibility — synced with CMS Featured Batches section. */
export function isLiveEnrollmentEnabled(
  content?: Pick<WebsiteContent, "sectionOrder" | "studentPortal"> | Record<string, unknown> | null,
): boolean {
  const sectionOrder = content?.sectionOrder as WebsiteContent["sectionOrder"] | undefined;
  return isHomeSectionEnabled("batches", sectionOrder);
}

export const RECORDED_COURSES_CATALOG_HREF = "/courses";
export const PUBLIC_ENROLL_HREF = "/enroll";
