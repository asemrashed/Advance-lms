import type { HeroContent } from "@/lib/websiteContentTypes";
import { defaultHeroContent } from "@/lib/websiteContentDefaults";

/** Merge stored hero with editorial defaults (AdvanceLMS home hero). */
export function mergeEditorialHeroContent(
  existing?: Partial<HeroContent> | null,
): HeroContent {
  const defaults = defaultHeroContent;
  const hero = existing ?? {};

  const tagline =
    hero.tagline?.trim() ||
    hero.subtitle?.trim() ||
    defaults.tagline ||
    defaults.subtitle;

  const introParagraphs =
    hero.introParagraphs?.filter((p) => p.trim()).length
      ? hero.introParagraphs!.filter((p) => p.trim())
      : defaults.introParagraphs ?? [];

  const bioLeft =
    hero.bioColumns?.left?.filter((p) => p.trim()).length
      ? hero.bioColumns!.left.filter((p) => p.trim())
      : defaults.bioColumns?.left ?? [];

  const bioRight =
    hero.bioColumns?.right?.filter((p) => p.trim()).length
      ? hero.bioColumns!.right.filter((p) => p.trim())
      : defaults.bioColumns?.right ?? [];

  const highlightValue =
    hero.highlightStat?.value?.trim() ||
    hero.stats?.students?.count?.trim() ||
    defaults.highlightStat?.value ||
    defaults.stats.students.count;

  const highlightLabel =
    hero.highlightStat?.label?.trim() ||
    defaults.highlightStat?.label ||
    "A & A* RATE";

  return {
    ...defaults,
    ...hero,
    subtitle: tagline,
    tagline,
    title: { ...defaults.title, ...hero.title },
    titleColors: { ...defaults.titleColors, ...hero.titleColors },
    gradientColors: hero.gradientColors ?? defaults.gradientColors,
    buttons: {
      primary: { ...defaults.buttons.primary, ...hero.buttons?.primary },
      secondary: { ...defaults.buttons.secondary, ...hero.buttons?.secondary },
    },
    carousel: { ...defaults.carousel, ...hero.carousel },
    stats: {
      students: {
        ...defaults.stats.students,
        ...hero.stats?.students,
        count: highlightValue,
        enabled: hero.stats?.students?.enabled ?? true,
      },
      courses: { ...defaults.stats.courses, ...hero.stats?.courses },
    },
    brandDisplayName:
      hero.brandDisplayName?.trim() || defaults.brandDisplayName,
    badge: hero.badge?.trim() || defaults.badge,
    introParagraphs,
    bioColumns: { left: bioLeft, right: bioRight },
    portraitImage:
      hero.portraitImage?.trim() || defaults.portraitImage,
    highlightStat: { value: highlightValue, label: highlightLabel },
    description:
      introParagraphs.length > 0
        ? introParagraphs.join("\n\n")
        : hero.description?.trim() || defaults.description,
  };
}

/** Apply editorial hero merge to a full website-content settings object. */
export function mergeEditorialHeroIntoSettings(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const hero = mergeEditorialHeroContent(
    settings.hero as Partial<HeroContent> | undefined,
  );

  const branding =
    settings.branding && typeof settings.branding === "object"
      ? { ...(settings.branding as Record<string, unknown>) }
      : {};

  if (hero.brandDisplayName && !String(branding.logoText ?? "").trim()) {
    branding.logoText = hero.brandDisplayName;
  }

  return {
    ...settings,
    hero,
    branding,
  };
}
