'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { SiteStatusShell } from '@/components/SiteStatusShell';
import type { SiteTheme } from '@/lib/siteTheme';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  theme?: SiteTheme;
  title?: string;
  description?: string;
  homeHref?: string;
};

export default function GlobalError({
  error,
  reset,
  theme = 'public',
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again or return home.',
  homeHref = '/',
}: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
    const isChunkError =
      error.name === "ChunkLoadError" ||
      /Loading chunk .+ failed/i.test(error.message);
    if (!isChunkError || typeof window === "undefined") return;
    const key = "chunk-load-reload";
    if (sessionStorage.getItem(key) === error.message) return;
    sessionStorage.setItem(key, error.message);
    window.location.reload();
  }, [error]);

  return (
    <SiteStatusShell theme={theme}>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-2xl border border-border bg-card p-8 shadow-editorial">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary shadow transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="rounded-lg border border-border px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Return home
          </Link>
        </div>
      </div>
    </SiteStatusShell>
  );
}
