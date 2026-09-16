import { CourseCardSkeleton } from "./CourseCardSkeleton";
import { StaggerContainer, StaggerItem } from "@/components/ui/fade-in";

const CARD_COUNT = 8;

type HomePageSkeletonProps = {
  /** When false, omit the featured-courses placeholder block (section hidden in CMS). */
  showCoursesSection?: boolean;
};

/** Hero + optional course grid; site nav comes from `SiteHeader` in the public layout. */
export function HomePageSkeleton({ showCoursesSection = true }: HomePageSkeletonProps) {
  return (
    <div className="bg-background text-foreground" role="status" aria-busy="true">
      <p className="sr-only">Loading homepage</p>

      {/* Hero */}
      <section className="animate-pulse bg-white">
        {/* Top Centered Section */}
        <div className="mx-auto max-w-7xl px-6 pt-14 md:px-10 md:pt-20 lg:px-16 lg:pt-24 flex flex-col items-start">
          <div className="h-4 w-48 rounded bg-muted mb-4" />
          <div className="w-[85%] sm:w-[80%] md:w-[75%] max-w-5xl text-left space-y-6">
            <div className="h-16 md:h-20 w-full rounded-lg bg-muted/80" />
            <div className="h-6 w-full rounded bg-muted/60" />
          </div>
        </div>

        {/* Two-Column Grid Section */}
        <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 pt-8 lg:grid-cols-2 items-center">
          {/* Left */}
          <div className="max-w-xl space-y-4">
            <div className="h-8 w-56 rounded-full bg-muted" />
            <div className="h-12 w-full max-w-md rounded-lg bg-muted/80" />
            <div className="space-y-3 pt-4">
              <div className="h-4 w-full rounded bg-muted/60" />
              <div className="h-4 w-5/6 rounded bg-muted/60" />
            </div>
          </div>
          {/* Right */}
          <div className="mx-auto aspect-[493/506] w-full max-w-lg rounded-xl bg-muted/40" />
        </div>

        {/* Bottom band — two-column story (bluish gradient matching loaded state) */}
        <div className="border-t border-outline-variant/20 bg-gradient-to-r from-secondary-container to-primary-container px-6 pb-16 pt-20 md:px-10 md:pb-20 md:pt-24 lg:px-16">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="h-4 w-full rounded bg-white/40" />
              <div className="h-4 w-5/6 rounded bg-white/40" />
            </div>
            <div className="space-y-4">
              <div className="h-4 w-full rounded bg-white/40" />
              <div className="h-4 w-5/6 rounded bg-white/40" />
            </div>
          </div>
        </div>
      </section>

      {showCoursesSection ? (
      <section className="px-4 py-12 sm:px-6 md:px-8 md:py-24">
        <div className="mx-auto max-w-screen-2xl">
          <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="h-12 w-2/3 max-w-md animate-pulse rounded-lg bg-muted" />
              <div className="h-5 w-full animate-pulse rounded-md bg-muted/80" />
              <div className="h-5 w-4/5 animate-pulse rounded-md bg-muted/80" />
            </div>
            <div className="h-5 w-28 animate-pulse rounded-md bg-muted" />
          </div>
          <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {Array.from({ length: CARD_COUNT }, (_, i) => (
              <StaggerItem key={`skeleton-${i}`}>
                <CourseCardSkeleton />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
      ) : null}
    </div>
  );
}
