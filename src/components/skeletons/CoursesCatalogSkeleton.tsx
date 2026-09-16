import { CourseCardSkeleton } from "./CourseCardSkeleton";
import { StaggerContainer, StaggerItem } from "@/components/ui/fade-in";
import { cn } from "@/lib/cn";

export function CoursesCatalogSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="text-foreground" role="status" aria-busy="true">
      <p className="sr-only">Loading courses catalog</p>

      {!embedded ? (
        <section className="relative flex h-100 items-center overflow-hidden bg-surface px-4 py-14 text-foreground md:px-8">
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            <img
              src="/images/hero-background.svg"
              alt=""
              className="h-full w-full object-cover object-top opacity-60"
            />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-8">
            <div className="max-w-2xl space-y-4">
              <div className="h-4 w-32 rounded-md bg-muted" />
              <div className="h-14 w-80 max-w-full rounded-lg bg-muted" />
              <div className="h-5 w-full max-w-lg rounded-md bg-muted/60" />
              <div className="h-5 w-4/5 max-w-md rounded-md bg-muted/60" />
            </div>
          </div>
        </section>
      ) : null}

      <section
        className={cn(
          "mx-auto flex max-w-screen-2xl flex-col gap-12 px-8 py-20 md:flex-row",
          embedded && "px-4 py-6 md:px-6",
        )}
      >
        <aside className="w-full shrink-0 md:w-64">
          <div className="sticky top-28 animate-pulse space-y-4">
            <div className="h-4 w-40 rounded-md bg-muted" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-12 w-full rounded-xl bg-muted/80" />
            ))}
            <div className="mt-8 h-40 rounded-2xl bg-muted/60" />
          </div>
        </aside>
        <div className="min-w-0 flex-grow">
          <div className="mb-12 h-10 w-64 animate-pulse rounded-lg bg-muted" />
          <StaggerContainer className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <StaggerItem key={`skeleton-${i}`}>
                <CourseCardSkeleton />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </div>
  );
}
