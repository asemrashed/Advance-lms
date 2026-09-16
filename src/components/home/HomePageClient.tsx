"use client";

/**
 * Home page sections (hero → blog) ordered by CMS `sectionOrder`.
 * Header/footer are in the public layout — not controlled here.
 */

import { useEffect, useMemo } from "react";
import { fetchPublicCourses, useAppDispatch, useAppSelector } from "@/store";
import type { PublicCourseRow } from "@/types/public-course";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";
import { HOME_PARTNERS } from "@/data/homePageContent";
import { resolveHomeHeroContent } from "@/lib/resolveHomeHeroContent";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomePartnersSection } from "@/components/home/HomePartnersSection";
import CourseCard from "../CourseCard";
import ExpertsCarousel from "../carousals/ExpertsCarousel";
import Testimonials from "./Testimonials";
import type { CourseReview } from "@/types/course-review";
import { mapFeaturedReviewsToTestimonials } from "@/lib/mapFeaturedReviewsToTestimonials";
import type { FeaturedInstructor } from "@/types/featured-instructor";
import { HomeFeaturesSection } from "@/components/features/HomeFeaturesSection";
import { HomeStatisticsSection } from "@/components/home/HomeStatisticsSection";
import { HomeBatchesSection } from "@/components/home/HomeBatchesSection";
import { HomeBlogSection } from "@/components/home/HomeBlogSection";
import ViewAllPillButton from "@/components/ui/buttons/ViewAllPillButton";
import { resolveFeaturesContent } from "@/lib/resolveFeaturesContent";
import { HomePageSkeleton } from "@/components/skeletons/HomePageSkeleton";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in";
import { resolveHomeSectionOrder } from "@/lib/homeSectionOrder";
import type { SectionId } from "@/lib/websiteContentTypes";

type HomePageClientProps = {
  cmsData: WebsiteContent | null;
  featuredReviews?: CourseReview[];
  featuredInstructors?: FeaturedInstructor[];
};

export function HomePageClient({
  cmsData,
  featuredReviews = [],
  featuredInstructors = [],
}: HomePageClientProps) {
  const dispatch = useAppDispatch();
  const { publicList, status: coursesStatus } = useAppSelector((s) => s.courses);

  const enabledSections = useMemo(
    () =>
      resolveHomeSectionOrder(cmsData?.sectionOrder).filter(
        (section) => section.enabled,
      ),
    [cmsData?.sectionOrder],
  );

  const coursesSectionEnabled = useMemo(
    () => enabledSections.some((section) => section.id === "courses"),
    [enabledSections],
  );

  const isCatalogInitialLoad =
    coursesSectionEnabled &&
    (coursesStatus === "idle" || coursesStatus === "loading") &&
    publicList.length === 0;

  const heroContent = useMemo(
    () => resolveHomeHeroContent(cmsData),
    [cmsData],
  );

  const promo = cmsData?.promotionalBanner;
  const coursesTitle = promo?.headline || "Courses Designed for Success";
  const coursesDescription =
    promo?.subtext ||
    "Curated paths focusing on high-impact skills that the global market demands today..";
  const coursesCtaLabel = promo?.ctaLabel || "View all";
  const coursesCtaHref = promo?.link || "/courses";

  const instructorsSection = cmsData?.homeInstructors;
  const experts = useMemo(
    () =>
      featuredInstructors.map((i) => ({
        id: i.id,
        name: i.name,
        role: i.roleLine,
        image: i.image,
        experience: i.experience,
      })),
    [featuredInstructors],
  );

  const testimonials = useMemo(
    () => mapFeaturedReviewsToTestimonials(featuredReviews),
    [featuredReviews],
  );

  const partnersTitle =
    cmsData?.partners?.title?.trim() || "Our Trusted Partners & Integrations";

  const partners = useMemo(() => {
    const items = cmsData?.partners?.items?.filter((item) => item.name?.trim());
    if (items && items.length > 0) {
      return items.map((item) => ({
        name: item.name.trim(),
        imageUrl: item.imageUrl?.trim() || "",
        href: item.href?.trim() || "",
      }));
    }
    const legacy = cmsData?.footer?.paymentGateway?.methods;
    if (legacy?.length) {
      return legacy.map((name) => ({ name, imageUrl: "", href: "" }));
    }
    return HOME_PARTNERS.map((name) => ({ name, imageUrl: "", href: "" }));
  }, [cmsData?.partners?.items, cmsData?.footer?.paymentGateway?.methods]);

  const featuresContent = useMemo(
    () => resolveFeaturesContent(cmsData),
    [cmsData],
  );

  useEffect(() => {
    if (!coursesSectionEnabled) return;
    if (coursesStatus === "idle") {
      dispatch(fetchPublicCourses(undefined));
    }
  }, [dispatch, coursesSectionEnabled, coursesStatus]);

  const featuredCourseIds = cmsData?.courses?.featuredCourseIds ?? [];
  const featuredCourses = useMemo(() => {
    if (!coursesSectionEnabled) return [];
    const maxCards = 4;
    const byId = new Map(publicList.map((c) => [String(c._id), c]));
    const pickedIds = new Set<string>();
    const ordered: PublicCourseRow[] = [];

    if (featuredCourseIds.length > 0) {
      for (const id of featuredCourseIds) {
        const course = byId.get(String(id));
        if (course && !pickedIds.has(String(course._id))) {
          pickedIds.add(String(course._id));
          ordered.push(course);
        }
      }
      for (const course of publicList) {
        if (ordered.length >= maxCards) break;
        const courseId = String(course._id);
        if (!pickedIds.has(courseId)) {
          pickedIds.add(courseId);
          ordered.push(course);
        }
      }
    } else {
      ordered.push(...publicList.slice(0, maxCards));
    }

    return ordered.map((course) => ({
      href: `/course/${course._id}`,
      image: course.thumbnailUrl || "",
      imageAlt: course.title,
      badge: course.tags?.[0] || (course.isPaid ? "Premium" : "Free"),
      badgeClass: "bg-primary text-on-primary",
      title: course.title,
      description:
        course.shortDescription || course.description || "Explore this course.",
      price: course.isPaid ? `${course.finalPrice ?? course.price ?? 0}` : "Free",
      lessons: `${course.lessonCount ?? 0}+ Lessons`,
    }));
  }, [coursesSectionEnabled, publicList, featuredCourseIds]);

  const renderSection = (sectionId: SectionId) => {
    switch (sectionId) {
      case "hero":
        return <HomeHeroSection key="hero" content={heroContent} />;
      case "statistics":
        return (
          <HomeStatisticsSection
            key="statistics"
            content={cmsData?.statistics}
          />
        );
      case "batches":
        return (
          <HomeBatchesSection key="batches" content={cmsData?.batches} />
        );
      case "courses":
        return (
          <section key="courses" className="px-4 py-12 sm:px-6 md:px-8 md:py-24">
            <div className="mx-auto max-w-screen-2xl">
              <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:mb-12 md:mb-16 md:flex-row md:items-end">
                <div className="max-w-2xl">
                  <h2 className="mb-4 font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                    {coursesTitle}
                  </h2>
                  <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                    {coursesDescription}
                  </p>
                </div>
                <ViewAllPillButton href={coursesCtaHref}>
                  {coursesCtaLabel}
                </ViewAllPillButton>
              </div>
              {featuredCourses.length === 0 ? (
                coursesStatus === "failed" ? (
                  <p className="rounded-xl border border-dashed border-destructive/40 p-12 text-center text-muted-foreground">
                    Could not load courses. Please refresh the page.
                  </p>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                    No courses to display yet. Check back soon or browse the full catalog.
                  </p>
                )
              ) : (
                <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                  {featuredCourses.map((c, i) => (
                    <StaggerItem key={`${c.title}-${i}`}>
                      <CourseCard course={c as any} index={i} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </div>
          </section>
        );
      case "features":
        return <HomeFeaturesSection key="features" content={featuresContent} />;
      case "instructors":
        return experts.length > 0 ? (
          <ExpertsCarousel
            key="instructors"
            experts={experts}
            badgeLabel={instructorsSection?.badgeLabel}
            sectionHeading={instructorsSection?.sectionHeading}
            sectionSubtitle={instructorsSection?.sectionSubtitle}
          />
        ) : null;
      case "testimonials":
        return <Testimonials key="testimonials" items={testimonials} />;
      case "partners":
        return <HomePartnersSection key="partners" title={partnersTitle} partners={partners} />;
      case "blog":
        return <HomeBlogSection key="blog" content={cmsData?.blog} />;
      default:
        return null;
    }
  };

  if (isCatalogInitialLoad) {
    return <HomePageSkeleton showCoursesSection={coursesSectionEnabled} />;
  }

  return (
    <div className="bg-background text-foreground">
      {enabledSections.map((section) => (
        <FadeIn key={section.id} direction="up" duration={0.6}>
          {renderSection(section.id)}
        </FadeIn>
      ))}
    </div>
  );
}
