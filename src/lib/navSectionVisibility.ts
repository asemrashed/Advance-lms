import { resolveHomeSectionOrder } from "@/lib/homeSectionOrder";
import type { SectionConfig } from "@/lib/websiteContentDefaults";
import type { SectionId } from "@/lib/websiteContentTypes";

const HOME_SECTION_IDS = new Set<string>([
  "hero",
  "statistics",
  "batches",
  "courses",
  "instructors",
  "testimonials",
  "features",
  "partners",
  "blog",
]);

/** Whether a home page section is enabled in CMS section order. */
export function isHomeSectionEnabled(
  sectionId: SectionId,
  saved?: SectionConfig[] | null,
): boolean {
  const section = resolveHomeSectionOrder(saved).find((item) => item.id === sectionId);
  return section?.enabled ?? true;
}

/** Map a nav href to the home section that controls its visibility, if any. */
export function resolveNavHrefSectionId(href: string): SectionId | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#") return null;

  const hashIndex = trimmed.indexOf("#");
  if (hashIndex >= 0) {
    const hash = trimmed
      .slice(hashIndex + 1)
      .split("?")[0]
      .toLowerCase();
    if (HOME_SECTION_IDS.has(hash)) {
      return hash as SectionId;
    }
  }

  const path = trimmed.split("?")[0].split("#")[0];
  if (path === "/courses") return "courses";
  if (path === "/blog" || path.startsWith("/blog/")) return "blog";
  if (path === "/enroll" || path.startsWith("/enroll/")) return "batches";

  return null;
}

/** Whether a nav/footer href should stay visible given CMS section order. */
export function isNavHrefVisible(
  href: string,
  saved?: SectionConfig[] | null,
): boolean {
  const sectionId = resolveNavHrefSectionId(href);
  if (!sectionId) return true;
  return isHomeSectionEnabled(sectionId, saved);
}

/** Drop nav items that point at disabled home sections. */
export function filterNavItemsBySectionOrder<T extends { href: string }>(
  items: T[],
  saved?: SectionConfig[] | null,
): T[] {
  return items.filter((item) => isNavHrefVisible(item.href, saved));
}
