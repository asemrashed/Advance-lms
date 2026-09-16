'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import WelcomeSection from '@/components/dashboard/lp/WelcomeSection';
import { AcademicListCard } from '@/components/academic-hub/AcademicListCard';
import { NoticePostPanel } from '@/components/notices/NoticePostPanel';
import { UpcomingClassesSection } from '@/components/academic-hub/UpcomingClassesSection';
import type { UpcomingClassItem } from '@/components/academic-hub/UpcomingClassesSection';
import {
  ScheduleUpdatesSection,
  useScheduleUnreadCount,
} from '@/components/academic-hub/ScheduleUpdatesSection';
import { NoticeBoardSection } from '@/components/academic-hub/NoticeBoardSection';

type NoticeBoardPageClientProps = {
  role: 'student' | 'instructor' | 'admin';
  userName?: string;
  upcomingClasses?: UpcomingClassItem[];
  batchesHref: string;
  manageNoticesHref?: string;
  instructors?: Array<{ _id: string; name: string }>;
  shell?: (content: ReactNode) => ReactNode;
  hideWelcome?: boolean;
};

export function NoticeBoardPageClient({
  role,
  userName,
  upcomingClasses = [],
  batchesHref,
  manageNoticesHref,
  instructors = [],
  shell,
  hideWelcome = false,
}: NoticeBoardPageClientProps) {
  const unreadSchedule = useScheduleUnreadCount();

  const content = (
    <>
      {!hideWelcome ? (
        <WelcomeSection
          title={
            role === 'student'
              ? `Notice board${userName ? ` — ${userName}` : ''}`
              : role === 'instructor'
                ? 'Notice board'
                : 'Academic notice board'
          }
          description="Upcoming classes, schedule changes, and announcements for your batches"
        />
      ) : null}

      {role === 'instructor' ? (
        <div className="mb-6">
          <NoticePostPanel role="instructor" />
        </div>
      ) : null}

      {role === 'admin' && manageNoticesHref ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Moderate all notices from the admin management page.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={manageNoticesHref}>Manage notices</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AcademicListCard title="Announcements" className="min-h-[320px]">
            <NoticeBoardSection />
          </AcademicListCard>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-1">
          <AcademicListCard title="Schedule updates" badge={unreadSchedule}>
            <ScheduleUpdatesSection batchesHref={batchesHref} />
          </AcademicListCard>

          <AcademicListCard title="Upcoming classes">
            <UpcomingClassesSection
              classes={upcomingClasses}
              batchesHref={batchesHref}
            />
          </AcademicListCard>
        </div>
      </div>

      {role === 'admin' ? (
        <div className="mt-6">
          <NoticePostPanel role="admin" instructors={instructors} />
        </div>
      ) : null}
    </>
  );

  const wrappedContent = hideWelcome ? (
    content
  ) : (
    <main className="relative z-10 p-2 sm:p-4">{content}</main>
  );

  return shell ? shell(wrappedContent) : wrappedContent;
}
