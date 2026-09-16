'use client';

import { type ReactNode, type RefObject } from 'react';

/** Fills available space; supports optional sidebar + main split via children. */
export function QuestionBankPageLayout({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className}`.trim()}>
      {children}
    </div>
  );
}

export function QuestionBankSplitLayout({
  sidebar,
  main,
  mainScrollRef,
  onMainWheel,
}: {
  sidebar: ReactNode;
  main: ReactNode;
  mainScrollRef?: RefObject<HTMLDivElement | null>;
  onMainWheel?: (event: React.WheelEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:items-stretch">
      <div className="flex max-h-[min(40vh,320px)] min-h-0 shrink-0 flex-col overflow-hidden lg:h-full lg:max-h-none lg:w-64 lg:shrink-0 xl:w-72">
        {sidebar}
      </div>
      <div
        ref={mainScrollRef}
        onWheel={onMainWheel}
        className="scrollbar-slim min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {main}
      </div>
    </div>
  );
}
