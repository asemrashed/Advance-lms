import "server-only";
import { unstable_cache } from "next/cache";
import { loadWebsiteContentSettings } from "@/app/api/_lib/websiteContentStore";
import {
  CACHE_TAG_WEBSITE_CONTENT,
  defaultAboutContent,
  defaultCoursesByCategoryContent,
  defaultCoursesContent,
  defaultFooterContent,
  defaultHeroContent,
  defaultWebsiteContent,
  type AboutContent,
  type CoursesByCategoryContent,
  type CoursesContent,
  type FooterContent,
  type HeroContent,
  type WebsiteContent,
} from "@/lib/websiteContentDefaults";

export type { WebsiteContent };

async function loadWebsiteContent(): Promise<WebsiteContent> {
  if (typeof window !== "undefined") {
    return defaultWebsiteContent;
  }

  try {
    return (await loadWebsiteContentSettings()) as unknown as WebsiteContent;
  } catch (error) {
    console.error("Error fetching website content:", error);
    return defaultWebsiteContent;
  }
}

const getCachedWebsiteContent = unstable_cache(loadWebsiteContent, ["website-content"], {
  tags: [CACHE_TAG_WEBSITE_CONTENT],
  revalidate: false,
});

async function getContentSlice<T>(
  selector: (content: WebsiteContent) => T | undefined,
  fallback: T,
): Promise<T> {
  const content = await getCachedWebsiteContent();
  return selector(content) ?? fallback;
}

export async function getWebsiteContent(): Promise<WebsiteContent> {
  return getCachedWebsiteContent();
}

export async function getHeroContent(): Promise<HeroContent> {
  return getContentSlice((content) => content.hero, defaultHeroContent);
}

export async function getAboutContent(): Promise<AboutContent> {
  return getContentSlice((content) => content.about, defaultAboutContent);
}

export async function getFooterContent(): Promise<FooterContent> {
  return getContentSlice((content) => content.footer, defaultFooterContent);
}

export async function getCoursesContent(): Promise<CoursesContent> {
  const courses = await getContentSlice((content) => content.courses, defaultCoursesContent);
  return {
    ...defaultCoursesContent,
    ...courses,
    featuredCourseIds: courses.featuredCourseIds,
  };
}

export async function getCoursesByCategoryContent(): Promise<CoursesByCategoryContent> {
  return getContentSlice(
    (content) => content.coursesByCategory,
    defaultCoursesByCategoryContent,
  );
}
