import { cn } from "@/lib/cn";

type CourseCardSkeletonProps = {
  list?: boolean;
};

export function CourseCardSkeleton({ list = false }: CourseCardSkeletonProps) {
  return (
    <div
      className={cn(
        "h-full w-full animate-pulse overflow-hidden rounded-lg bg-surface-container shadow-md",
        list
          ? "flex flex-row items-center gap-3 p-3 sm:gap-4 sm:p-4 md:gap-6"
          : "flex flex-col",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "shrink-0 bg-muted",
          list
            ? "aspect-video w-36 rounded-lg sm:w-42 md:w-68"
            : "aspect-[4/3] w-full sm:aspect-video",
        )}
      />
      <div
        className={cn(
          "flex flex-1 flex-col gap-2",
          list ? "min-w-0" : "p-3 sm:gap-3 sm:p-4",
        )}
      >
        <div className="h-5 w-3/4 max-w-xs rounded-md bg-muted sm:h-6" />
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-outline-variant/20 pt-2">
          <div className="h-5 w-16 rounded-md bg-muted sm:h-7 sm:w-20" />
          <div className="h-3.5 w-16 rounded-md bg-muted/80 sm:h-4 sm:w-24" />
        </div>
        <div className="h-9 w-full rounded-lg bg-muted sm:h-10" />
      </div>
    </div>
  );
}
