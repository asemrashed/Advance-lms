'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { resolveImageSrc } from '@/lib/resolveImageSrc';
import { Button } from '@/components/ui/button';

export function InstructorPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn('instructor-theme relative z-10 space-y-5 p-4 sm:p-6', className)}
    >
      {children}
    </main>
  );
}

export function InstructorTopbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const dateLabel = new Date().toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {dateLabel}
        </div>
        {actions}
      </div>
    </div>
  );
}

export function InstructorWelcomeBanner({
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-primary px-5 py-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-primary-foreground/80">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {primaryAction ? (
          <Button
            asChild
            className="rounded-full bg-white text-primary hover:bg-white/90"
          >
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </Button>
        ) : null}
        {secondaryAction ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function InstructorStatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
          {label}
        </div>
        {icon ? <div className="hidden opacity-40 sm:block">{icon}</div> : null}
      </div>
      <div className={cn('text-xl font-bold leading-none sm:text-3xl', accent)}>
        {value}
      </div>
      {sub ? (
        <div className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-muted-foreground sm:mt-2 sm:text-xs">{sub}</div>
      ) : null}
    </div>
  );
}

export function InstructorCard({
  title,
  href,
  linkLabel = 'View all',
  children,
  actions,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5 sm:px-5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {actions}
          {href ? (
            <Link
              href={href}
              className="text-xs font-medium text-primary hover:underline"
            >
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function InstructorEmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function InstructorLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <p className="sr-only">{label}</p>
      <div className="h-8 w-40 max-w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted/80" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted/70" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
    </div>
  );
}

export function InstructorPill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

export function InstructorFilterTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'rounded-[10px] border px-4 py-2 text-sm font-semibold transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}

export function InstructorStatusBadge({
  status,
  label,
}: {
  status: 'published' | 'draft' | 'pending' | 'archived' | 'success' | 'warning' | 'error' | 'info';
  label?: string;
}) {
  const styles: Record<string, string> = {
    published: 'bg-white/95 text-green-700',
    success: 'bg-green-50 text-green-700 border border-green-200',
    draft: 'bg-white/95 text-amber-700',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    pending: 'bg-white/95 text-orange-700',
    archived: 'bg-white/95 text-muted-foreground',
    error: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-primary/10 text-primary border border-primary/20',
  };
  const text =
    label ||
    (status === 'pending'
      ? 'Pending'
      : status.charAt(0).toUpperCase() + status.slice(1));
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        styles[status] || styles.info,
      )}
    >
      {text}
    </span>
  );
}

export function InstructorCourseCard({
  title,
  subtitle,
  status,
  statusLabel,
  bannerTone = 'primary',
  bannerIcon = '📘',
  thumbnailUrl,
  stats,
  priceLabel,
  manageHref,
  manageLabel = 'Manage Curriculum →',
  editHref,
  editLabel = 'Edit Course',
  onManage,
  onDelete,
}: {
  title: string;
  subtitle: string;
  status: 'published' | 'draft' | 'pending' | 'archived';
  statusLabel?: string;
  bannerTone?: 'primary' | 'blue';
  bannerIcon?: string;
  thumbnailUrl?: string;
  stats: Array<{ value: string; label: string }>;
  priceLabel: string;
  manageHref?: string;
  manageLabel?: string;
  editHref?: string;
  editLabel?: string;
  onManage?: () => void;
  onDelete?: () => void;
}) {
  const banner =
    bannerTone === 'blue'
      ? 'bg-gradient-to-br from-sky-500 to-blue-800'
      : 'bg-gradient-to-br from-primary to-blue-900';

  return (
    <article className="overflow-hidden rounded-[18px] border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={cn(
          'relative flex aspect-video w-full items-center justify-center overflow-hidden text-2xl text-white/90 sm:text-3xl',
          !thumbnailUrl && banner,
        )}
      >
        {thumbnailUrl ? (
          <img
            src={resolveImageSrc(thumbnailUrl)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>{bannerIcon}</span>
        )}
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <InstructorStatusBadge status={status} label={statusLabel} />
        </div>
      </div>
      <div className="p-3 sm:p-5">
        <h3 className="line-clamp-2 text-sm font-extrabold leading-snug tracking-tight sm:text-base">{title}</h3>
        <p className="mb-3 mt-0.5 line-clamp-1 text-[10px] text-muted-foreground sm:mb-4 sm:text-xs">{subtitle}</p>
        <div className="mb-3 flex gap-2 sm:mb-4 sm:gap-3">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-primary sm:text-base">{s.value}</div>
              <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:pt-3">
          <div
            className={cn(
              'text-xs font-extrabold sm:text-sm',
              priceLabel.toLowerCase().includes('free')
                ? 'text-muted-foreground'
                : 'text-green-600',
            )}
          >
            {priceLabel}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="text-[10px] font-bold text-red-600 hover:underline sm:text-xs"
              >
                Delete
              </button>
            ) : null}
            {editHref ? (
              <Link
                href={editHref}
                className="text-[10px] font-bold text-muted-foreground hover:text-primary hover:underline sm:text-xs"
              >
                {editLabel}
              </Link>
            ) : null}
            {manageHref ? (
              <Link
                href={manageHref}
                className="text-[10px] font-bold text-primary hover:underline sm:text-xs"
              >
                <span className="sm:hidden">Manage →</span>
                <span className="hidden sm:inline">{manageLabel}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onManage}
                className="text-[10px] font-bold text-primary hover:underline sm:text-xs"
              >
                {manageLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function InstructorCreateCourseCard({
  href,
  title = 'Create a New Course',
  subtitle = 'Pick a subject, set your batch schedule and start teaching.',
}: {
  href: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-border p-4 text-center transition-all hover:border-primary hover:bg-primary/5 sm:min-h-[280px] sm:gap-3 sm:p-8"
    >
      <div className="flex h-13 w-13 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
        +
      </div>
      <div className="text-sm font-bold">{title}</div>
      <div className="max-w-[220px] text-xs text-muted-foreground">{subtitle}</div>
    </Link>
  );
}

export function InstructorSplitPane({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]',
        className,
      )}
    >
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}

export function InstructorProgressCell({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="min-w-[90px]">
      {label ? (
        <div className="mb-1 text-xs font-semibold text-foreground">{label}</div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] font-medium text-muted-foreground">
        {pct}%
      </div>
    </div>
  );
}

export function InstructorTransactionRow({
  title,
  subtitle,
  amount,
  status,
  meta,
  action,
}: {
  title: string;
  subtitle?: string;
  amount: string;
  status: ReactNode;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{title}</div>
        {subtitle ? (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-bold">{amount}</div>
        <div>{status}</div>
        {meta ? (
          <div className="text-xs text-muted-foreground">{meta}</div>
        ) : null}
        {action}
      </div>
    </div>
  );
}

export function InstructorSectionLabel({
  children,
  href,
  linkLabel = 'View all',
}: {
  children: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {href ? (
        <Link href={href} className="text-xs font-medium text-primary hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function InstructorKpiGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
