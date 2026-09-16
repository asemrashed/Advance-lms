'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function StudentPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        'student-theme relative z-10 space-y-5 p-4 sm:p-6',
        className,
      )}
    >
      {children}
    </main>
  );
}

export function StudentTopbar({
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
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
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

export function StudentCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StudentFilterTabs({
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

export function StudentLoadingState({
  label = 'Loading…',
}: {
  label?: string;
}) {
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

export function StudentEmptyState({
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
