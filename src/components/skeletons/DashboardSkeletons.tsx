import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardRole } from "@/types/dashboard";

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

function PanelSkeleton({
  className,
  rows = 4,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors AdminDashboardParity layout. */
export function AdminDashboardSkeleton() {
  return (
    <main
      className="relative z-10 space-y-6 p-2 sm:p-4"
      role="status"
      aria-busy="true"
    >
      <p className="sr-only">Loading admin dashboard</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      <section className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={`live-${i}`} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={`rec-${i}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-4"
            >
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-4 gap-3 border-b border-border px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-3 border-b border-border px-4 py-4 last:border-0"
            >
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <PanelSkeleton rows={5} />
        </div>
      </div>
    </main>
  );
}

/** Mirrors InstructorDashboardParity layout. */
export function InstructorDashboardSkeleton() {
  return (
    <main
      className="instructor-theme relative z-10 space-y-5 p-4 sm:p-6"
      role="status"
      aria-busy="true"
    >
      <p className="sr-only">Loading instructor dashboard</p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-36 rounded-full" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-5 flex flex-wrap gap-3">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[110px] rounded-2xl border border-border bg-card p-3"
            >
              <Skeleton className="h-3 w-10" />
              <Skeleton className="mt-2 h-4 w-6" />
              <Skeleton className="mt-4 h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <PanelSkeleton rows={4} />
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-3 h-8 w-12" />
            <Skeleton className="mt-2 h-3 w-44" />
          </div>
          <PanelSkeleton rows={3} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <PanelSkeleton rows={4} />
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <Skeleton className="mb-3 h-4 w-28" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
          <PanelSkeleton rows={3} />
        </div>
      </div>
    </main>
  );
}

/** Mirrors StudentDashboardParity layout. */
export function StudentDashboardSkeleton() {
  return (
    <main
      className="w-full min-w-0 space-y-5 p-4 sm:p-6"
      role="status"
      aria-busy="true"
    >
      <p className="sr-only">Loading student dashboard</p>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-44 rounded-full" />
      </header>

      <Skeleton className="h-36 w-full rounded-[20px]" />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <article
            key={i}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <Skeleton className="mb-3 h-9 w-9 rounded-xl" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-14" />
            <Skeleton className="mt-2 h-3 w-full" />
          </article>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(270px,0.75fr)]">
        <PanelSkeleton rows={5} />
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mx-auto mt-4 h-28 w-28 rounded-full" />
            <Skeleton className="mx-auto mt-4 h-3 w-24" />
          </div>
          <PanelSkeleton rows={2} />
          <PanelSkeleton rows={2} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={4} />
      </div>

      <Skeleton className="h-48 w-full rounded-2xl" />
    </main>
  );
}

/** Lightweight placeholder for non-dashboard role routes (courses, settings, etc.). */
export function RoleAreaPageSkeleton() {
  return (
    <div
      className="space-y-5 p-4 sm:p-6"
      role="status"
      aria-busy="true"
    >
      <p className="sr-only">Loading page</p>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <PanelSkeleton rows={6} />
    </div>
  );
}

export function RoleDashboardSkeleton({ role }: { role: DashboardRole }) {
  if (role === "admin") return <AdminDashboardSkeleton />;
  if (role === "instructor") return <InstructorDashboardSkeleton />;
  return <StudentDashboardSkeleton />;
}
