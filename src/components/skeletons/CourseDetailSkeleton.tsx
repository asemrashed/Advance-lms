export function CourseDetailSkeleton({ liveEnroll = false }: { liveEnroll?: boolean }) {
  const tabCount = liveEnroll ? 5 : 4;

  return (
    <div
      className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 animate-pulse"
      role="status"
      aria-busy="true"
    >
      <p className="sr-only">Loading course details</p>

      <aside className="order-first w-full lg:order-last lg:col-span-4">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-editorial lg:sticky lg:top-28">
          <div className="h-56 w-full rounded-lg bg-muted" />
          <div className="mt-6 h-10 w-36 rounded-md bg-muted" />
          <div className="mt-2 h-4 w-48 rounded-md bg-muted/70" />
          {liveEnroll && (
            <div className="mt-4 space-y-2">
              <div className="h-4 w-24 rounded-md bg-muted/70" />
              <div className="h-12 w-full rounded-lg bg-muted/60" />
              <div className="h-12 w-full rounded-lg bg-muted/60" />
            </div>
          )}
          <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
            <div className="h-4 w-32 rounded-md bg-muted/70" />
            <div className="h-3 w-full rounded-md bg-muted/60" />
            <div className="h-3 w-[90%] rounded-md bg-muted/60" />
            <div className="h-3 w-[85%] rounded-md bg-muted/60" />
          </div>
          <div className="mt-4 h-11 w-full rounded-lg bg-muted/80" />
        </div>
      </aside>

      <div className="w-full space-y-8 lg:col-span-8">
        <div className="h-4 w-24 rounded-md bg-muted" />
        <div className="h-12 w-full rounded-lg bg-muted" />
        <div className="h-5 w-full rounded-md bg-muted/80" />
        <div className="h-5 w-[92%] rounded-md bg-muted/80" />
        <div className="h-5 w-[78%] rounded-md bg-muted/80" />

        <div className="flex flex-wrap gap-6 border-b border-border/40 pb-4">
          {Array.from({ length: tabCount }, (_, i) => (
            <div key={i} className="h-5 w-20 rounded-md bg-muted" />
          ))}
        </div>

        <div className="space-y-4">
          <div className="h-8 w-56 rounded-lg bg-muted" />
          <div className="h-4 w-full rounded-md bg-muted/80" />
          <div className="h-4 w-full rounded-md bg-muted/80" />
          <div className="h-4 w-full rounded-md bg-muted/80" />
          <div className="h-4 w-[88%] rounded-md bg-muted/80" />
        </div>

        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 rounded-md bg-muted/60" />
          ))}
        </div>

        {liveEnroll && (
          <div className="space-y-3">
            <div className="h-8 w-48 rounded-lg bg-muted" />
            <div className="h-4 w-full max-w-xl rounded-md bg-muted/70" />
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="h-14 w-full rounded-xl bg-muted/50" />
            ))}
          </div>
        )}

        <div className="h-72 w-full rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}
