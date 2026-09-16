'use client';

import Link from 'next/link';
import { AcademicListEmpty, AcademicListItem } from '@/components/academic-hub/AcademicListItem';
import { formatShortDateTime } from '@/components/academic-hub/academicHubUtils';
import { batchDeepLink } from '@/components/academic-hub/batchDeepLink';
import type { StudentDashboardUpcomingClass } from '@/types/studentDashboard';
import { LuExternalLink, LuVideo } from 'react-icons/lu';

export type UpcomingClassItem = StudentDashboardUpcomingClass & {
  endsAt?: string;
  status?: 'live_now' | 'starting_soon' | 'upcoming';
  recurrence?: string;
};

function classIconClass(status?: UpcomingClassItem['status']) {
  if (status === 'live_now') return 'text-emerald-600 bg-emerald-100';
  if (status === 'starting_soon') return 'text-amber-600 bg-amber-100';
  return 'text-indigo-600 bg-indigo-100';
}

export function UpcomingClassesSection({
  classes,
  maxItems,
  batchesHref = '/student/courses',
  emptyMessage = 'No upcoming classes.',
}: {
  classes: UpcomingClassItem[];
  maxItems?: number;
  batchesHref?: string;
  compact?: boolean;
  emptyMessage?: string;
}) {
  const rows = maxItems ? classes.slice(0, maxItems) : classes;

  if (rows.length === 0) {
    return <AcademicListEmpty message={emptyMessage} icon={LuVideo} />;
  }

  return (
    <ul className="space-y-1">
      {rows.map((cls) => (
        <li key={cls._id}>
          <AcademicListItem
            icon={LuVideo}
            iconClassName={classIconClass(cls.status)}
            title={cls.title}
            subtitle={`${cls.batchName}${cls.recurrence && cls.recurrence !== 'once' ? ` · repeats ${cls.recurrence}` : ''}`}
            meta={formatShortDateTime(cls.scheduledAt)}
            unread={cls.status === 'live_now' || cls.status === 'starting_soon'}
            trailing={
              cls.joinUrl ? (
                <a
                  href={cls.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-[10px] font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cls.type === 'recorded' ? 'Watch' : 'Join'}
                  <LuExternalLink className="ml-0.5 h-3 w-3" />
                </a>
              ) : (
                <Link
                  href={batchDeepLink(batchesHref, cls.batchId)}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  Open
                </Link>
              )
            }
          />
        </li>
      ))}
    </ul>
  );
}
