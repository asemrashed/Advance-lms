import Image from "next/image";

export function BatchDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse" role="status" aria-busy="true">
      <p className="sr-only">Loading batch details</p>
      
      <section className="relative overflow-hidden bg-surface px-4 py-14 md:px-8">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <Image
            src="/images/hero-background.svg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-60"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="mb-4 h-8 w-24 rounded-md bg-muted" />
          <div className="h-5 w-20 rounded-md bg-primary/30" />
          <div className="mt-4 h-10 w-full max-w-xl rounded-lg bg-muted" />
          <div className="mt-4 h-6 w-full max-w-2xl rounded-md bg-muted/60" />
          <div className="mt-2 h-6 w-4/5 max-w-xl rounded-md bg-muted/60" />
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:px-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
          <section>
            <div className="mb-2 h-7 w-48 rounded-md bg-muted" />
            <div className="mb-4 h-5 w-full max-w-md rounded-md bg-muted/60" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="h-6 w-32 rounded-md bg-muted" />
                  <div className="mt-2 h-4 w-24 rounded-md bg-muted/60" />
                  <div className="mt-4 h-9 w-full rounded-md bg-muted" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 h-7 w-40 rounded-md bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="mb-3 h-6 w-6 rounded-full bg-emerald-600/20" />
                  <div className="h-5 w-full rounded-md bg-muted" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-6">
            <div className="mb-4 h-7 w-32 rounded-md bg-muted" />
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-40 rounded-md bg-muted" />
                <div className="h-4 w-24 rounded-md bg-muted/60" />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 h-7 w-48 rounded-md bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded-md bg-muted/60" />
              <div className="h-4 w-full rounded-md bg-muted/60" />
              <div className="h-4 w-5/6 rounded-md bg-muted/60" />
              <div className="h-4 w-4/5 rounded-md bg-muted/60" />
            </div>
          </section>
        </div>

        <aside>
          <div className="sticky top-28 rounded-2xl border border-border bg-card p-6 shadow-editorial">
            <div className="h-6 w-32 rounded-md bg-muted" />
            <div className="mt-4 h-10 w-40 rounded-lg bg-muted" />
            <div className="mt-6 h-11 w-full rounded-lg bg-muted" />
            <div className="mt-4 flex items-center justify-center gap-2 border-t pt-4">
              <div className="h-4 w-4 rounded-full bg-muted" />
              <div className="h-4 w-32 rounded-md bg-muted/60" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
