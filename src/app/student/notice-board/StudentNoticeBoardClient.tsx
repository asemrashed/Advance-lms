'use client';

import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import { NoticeBoardPageClient } from '@/components/academic-hub/NoticeBoardPageClient';
import type { UpcomingClassItem } from '@/components/academic-hub/UpcomingClassesSection';
import { apiFetch } from '@/lib/api/httpClient';

export default function StudentNoticeBoardClient() {
  const authUser = useAppSelector((s) => s.auth.user);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClassItem[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch('/api/student/upcoming-classes?limit=20');
      const json = await res.json();
      if (json?.success && json.data?.upcomingClasses) {
        setUpcomingClasses(json.data.upcomingClasses);
      }
    })();
  }, []);

  const userName = authUser
    ? authUser.name
    : undefined;

  return (
    <StudentRoleShell>
      <NoticeBoardPageClient
        role="student"
        userName={userName}
        upcomingClasses={upcomingClasses}
        batchesHref="/student/courses"
      />
    </StudentRoleShell>
  );
}
