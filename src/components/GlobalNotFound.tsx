import Link from 'next/link';
import { SiteStatusShell } from '@/components/SiteStatusShell';
import type { SiteTheme } from '@/lib/siteTheme';

type GlobalNotFoundProps = {
  theme?: SiteTheme;
  code?: string;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function GlobalNotFound({
  theme = 'public',
  code = '404',
  title = 'Page not found',
  description = "Sorry, we couldn't find the page you're looking for. It may have been moved or removed.",
  homeHref = '/',
  homeLabel = 'Return home',
  actionHref,
  actionLabel,
}: GlobalNotFoundProps) {
  return (
    <SiteStatusShell theme={theme}>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-2xl border border-border bg-card p-8 shadow-editorial">
        <p className="text-6xl font-black text-primary">{code}</p>
        <h2 className="mt-4 text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={homeHref}
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary shadow transition-colors hover:bg-primary/90"
          >
            {homeLabel}
          </Link>
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className="rounded-lg border border-border px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </SiteStatusShell>
  );
}
