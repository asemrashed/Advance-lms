'use client';

import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

export function AcademicListItem({
  icon: Icon,
  iconClassName = 'text-blue-600 bg-blue-100',
  title,
  subtitle,
  meta,
  trailing,
  unread,
  onClick,
  accentClassName,
}: {
  icon: IconType;
  iconClassName?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
  unread?: boolean;
  onClick?: () => void;
  accentClassName?: string;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-50/80 ${
        accentClassName ?? ''
      } ${unread ? 'bg-primary/[0.03]' : ''}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-gray-900 line-clamp-2">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500 line-clamp-2">
            {subtitle}
          </p>
        ) : null}
        {meta ? <p className="mt-1 text-xs text-gray-400">{meta}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        {trailing}
        {unread ? (
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-label="Unread" />
        ) : null}
      </div>
    </Wrapper>
  );
}

export function AcademicListEmpty({
  message,
  icon: Icon,
}: {
  message: string;
  icon?: IconType;
}) {
  return (
    <div className="py-6 text-center">
      {Icon ? <Icon className="mx-auto mb-2 h-8 w-8 text-gray-300" /> : null}
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
