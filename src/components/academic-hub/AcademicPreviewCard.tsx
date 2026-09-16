'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { Button } from '@/components/ui/button';
import { LuArrowRight } from 'react-icons/lu';

export function AcademicPreviewCard({
  title,
  icon: Icon,
  href,
  badge,
  loading,
  emptyText,
  children,
}: {
  title: string;
  icon: IconType;
  href: string;
  badge?: string | number | null;
  loading?: boolean;
  emptyText?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold">{title}</h3>
          {badge != null && Number(badge) > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
      <div className="min-h-[88px] flex-1 text-sm">
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : children ? (
          children
        ) : (
          <p className="text-muted-foreground">{emptyText ?? 'Nothing to show yet.'}</p>
        )}
      </div>
      <Button asChild variant="ghost" size="sm" className="mt-3 w-fit px-0">
        <Link href={href}>
          View details
          <LuArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
