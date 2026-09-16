'use client';

import { useMemo, useState } from 'react';
import type { UpcomingClassItem } from '@/components/academic-hub/UpcomingClassesSection';
import { UpcomingClassesSection } from '@/components/academic-hub/UpcomingClassesSection';
import {
  ScheduleUpdatesSection,
  useScheduleUnreadCount,
} from '@/components/academic-hub/ScheduleUpdatesSection';
import { NoticeBoardSection } from '@/components/academic-hub/NoticeBoardSection';
import { AcademicListCard } from '@/components/academic-hub/AcademicListCard';

export function BatchAcademicPreviewGrid({
  noticeBoardHref,
  upcomingClasses = [],
  batchesHref = '/student/courses',
  columns = 3,
  showClassTabs = false,
}: {
  noticeBoardHref: string;
  upcomingClasses?: UpcomingClassItem[];
  batchesHref?: string;
  /** 2 = upcoming | schedule, notice full width; 3 = three equal cards */
  columns?: 2 | 3;
  showClassTabs?: boolean;
}) {
  const unreadSchedule = useScheduleUnreadCount();
  const [classTab, setClassTab] = useState<'today' | 'upcoming'>('today');
  const previewClasses = useMemo(() => {
    if (!showClassTabs) return upcomingClasses.slice(0, 3);

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return upcomingClasses
      .filter((item) => {
        const date = new Date(item.scheduledAt);
        if (Number.isNaN(date.getTime())) return false;
        const itemKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        return classTab === 'today'
          ? itemKey === todayKey
          : itemKey !== todayKey && date.getTime() > now.getTime();
      })
      .slice(0, 3);
  }, [classTab, showClassTabs, upcomingClasses]);

  return (
    <div
      className={`mt-0 grid grid-cols-1 gap-4 ${columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}
    >
      <AcademicListCard
        title="Upcoming classes"
        footerHref={batchesHref}
        footerLabel="View classes"
        actions={
          showClassTabs ? (
            <div className="flex rounded-lg bg-muted p-0.5">
              {(['today', 'upcoming'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setClassTab(tab)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold capitalize transition ${
                    classTab === tab
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          ) : undefined
        }
        className="h-full min-h-[220px]"
      >
        <UpcomingClassesSection
          classes={previewClasses}
          maxItems={3}
          compact
          batchesHref={batchesHref}
          emptyMessage={
            showClassTabs && classTab === 'today'
              ? 'No classes scheduled today.'
              : 'No upcoming classes.'
          }
        />
      </AcademicListCard>

      <AcademicListCard
        title="Schedule updates"
        badge={unreadSchedule}
        footerHref={noticeBoardHref}
        className="h-full min-h-[220px]"
      >
        <ScheduleUpdatesSection
          maxItems={3}
          compact
          showActions={false}
          batchesHref={batchesHref}
        />
      </AcademicListCard>

      <AcademicListCard
        title="Notice board"
        footerHref={noticeBoardHref}
        className={`h-full min-h-[220px] ${columns === 2 ? 'md:col-span-2' : ''}`}
      >
        <NoticeBoardSection maxItems={3} compact />
      </AcademicListCard>
    </div>
  );
}

export function StaffAcademicPreviewGrid({
  noticeBoardHref,
  upcomingClasses,
  batchesHref,
  columns = 3,
}: {
  noticeBoardHref: string;
  upcomingClasses: Array<{
    _id: string;
    batchId: string;
    batchName: string;
    title: string;
    scheduledAt: string;
    type: 'live' | 'recorded';
  }>;
  batchesHref: string;
  columns?: 2 | 3;
}) {
  const mapped: UpcomingClassItem[] = upcomingClasses.map((c) => ({
    ...c,
    durationMinutes: 0,
  }));

  return (
    <BatchAcademicPreviewGrid
      noticeBoardHref={noticeBoardHref}
      upcomingClasses={mapped}
      batchesHref={batchesHref}
      columns={columns}
    />
  );
}
