import { Skeleton } from "@/components/ui/skeleton";
import { ResourcePageContainer } from "@/components/resources/ResourcePageContainer";

type ResourceBrowseSkeletonProps = {
  showPageHeader?: boolean;
  variant?: "grid" | "list" | "table";
};

export function ResourceBrowseSkeleton({
  showPageHeader = true,
  variant = "grid",
}: ResourceBrowseSkeletonProps) {
  return (
    <ResourcePageContainer>
      {showPageHeader ? (
        <header className="mb-6 space-y-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </header>
      ) : null}

      <Skeleton className="mb-6 h-14 w-full rounded-xl" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg sm:w-48" />
      </div>

      {variant === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : variant === "table" ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}
    </ResourcePageContainer>
  );
}
