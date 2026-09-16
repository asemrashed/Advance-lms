'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';

export function AcademicListCard({
  title,
  badge,
  actions,
  footerHref,
  footerLabel = 'View all',
  className = '',
  children,
}: {
  title: string;
  badge?: string | number | null;
  actions?: ReactNode;
  footerHref?: string;
  footerLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-gray-200/60 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {badge != null && Number(badge) > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {badge}
            </span>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="flex-1 p-4 sm:p-5">{children}</div>
      {footerHref ? (
        <div className="border-t border-gray-200/60 px-4 py-2 sm:px-5">
          <Link
            href={footerHref}
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            {footerLabel}
            <LuArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
