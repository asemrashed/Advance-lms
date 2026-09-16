import { HOME_HERO } from "@/data/homePageContent";
import { mergeEditorialHeroContent } from "@/lib/mergeHeroContent";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";
import { SITE_BRAND_NAME } from "@/lib/siteBrandingConstants";

export type ResolvedHomeHero = {
  tagline: string;
  brandName: string;
  badge: string;
  headlineBefore: string;
  headlineAccent: string;
  introParagraphs: string[];
  bioLeft: string[];
  bioRight: string[];
  portraitSrc: string;
  statValue: string;
  statLabel: string;
};

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function joinTitleParts(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join("");
}

export function resolveHomeHeroContent(
  cmsData?: WebsiteContent | null,
): ResolvedHomeHero {
  const branding = cmsData?.branding;
  const hero = mergeEditorialHeroContent(cmsData?.hero);

  return {
    tagline: hero.tagline || hero.subtitle || HOME_HERO.tagline,
    brandName:
      hero.brandDisplayName?.trim() ||
      branding?.logoText?.trim() ||
      SITE_BRAND_NAME,
    badge: hero.badge?.trim() || HOME_HERO.badge,
    headlineBefore: hero.title.part1?.trim() || HOME_HERO.headlineBefore,
    headlineAccent:
      joinTitleParts(
        hero.title.part2,
        hero.title.part3,
        hero.title.part4,
        hero.title.part5,
      ) || HOME_HERO.headlineAccent,
    introParagraphs:
      hero.introParagraphs?.length
        ? hero.introParagraphs
        : splitParagraphs(hero.description).length > 0
          ? splitParagraphs(hero.description)
          : HOME_HERO.introParagraphs,
    bioLeft: hero.bioColumns?.left?.length
      ? hero.bioColumns.left
      : HOME_HERO.bioLeft,
    bioRight: hero.bioColumns?.right?.length
      ? hero.bioColumns.right
      : HOME_HERO.bioRight,
    portraitSrc: hero.portraitImage?.trim() || HOME_HERO.heroImage,
    statValue:
      hero.highlightStat?.value?.trim() ||
      hero.stats.students.count?.trim() ||
      HOME_HERO.statValue,
    statLabel: hero.highlightStat?.label?.trim() || HOME_HERO.statLabel,
  };
}
