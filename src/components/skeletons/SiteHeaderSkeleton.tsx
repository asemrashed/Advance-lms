/** Mirrors public `SiteHeader` height and layout for page-level loading states. */
export function SiteHeaderSkeleton() {
  return (
    <div
      className="animate-pulse border-b border-border/40 bg-background px-6 py-4 md:px-8"
      aria-hidden
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="h-6 w-28 rounded-md bg-muted" />
        </div>
        <div className="hidden flex-1 justify-center gap-8 md:flex">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-16 rounded-md bg-muted" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted" />
          <div className="hidden h-10 w-24 rounded-lg bg-muted sm:block" />
        </div>
      </div>
    </div>
  );
}
