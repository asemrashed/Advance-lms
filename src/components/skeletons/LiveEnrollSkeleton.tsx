import { CourseCardSkeleton } from "@/components/skeletons/CourseCardSkeleton";
import { StaggerContainer, StaggerItem } from "@/components/ui/fade-in";

type PublicCourseBrowseSkeletonProps = {
  label?: string;
};

/** Shared enroll / recorded-courses browse chrome: title, filters, card grid. */
export function PublicCourseBrowseSkeleton({
  label = "Loading courses",
}: PublicCourseBrowseSkeletonProps) {
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6"
      role="status"
      aria-busy="true"
    >
      <p className="sr-only">{label}</p>

      <div className="mb-8 space-y-3">
        <div className="h-9 w-56 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded-md bg-muted/70" />
        <div className="h-4 w-4/5 max-w-xl animate-pulse rounded-md bg-muted/60" />
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`filter-${i}`}
            className="h-10 w-full animate-pulse rounded-lg bg-muted/80 lg:max-w-[220px]"
          />
        ))}
        <div className="h-10 w-full flex-1 animate-pulse rounded-lg bg-muted/80" />
      </div>

      <StaggerContainer
        viewport={false}
        className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <StaggerItem key={`skeleton-${i}`} className="h-full w-full">
            <CourseCardSkeleton />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

/** @deprecated Prefer PublicCourseBrowseSkeleton */
export function LiveEnrollSkeleton() {
  return <PublicCourseBrowseSkeleton label="Loading live courses" />;
}
