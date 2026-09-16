import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { PublicEnrollClient } from '@/components/enroll/PublicEnrollClient';
import { PublicCourseBrowseSkeleton } from '@/components/skeletons/LiveEnrollSkeleton';
import { getWebsiteContent } from '@/lib/website-content';
import { isLiveEnrollmentEnabled } from '@/lib/studentPortalSettings';

export const metadata: Metadata = {
  title: 'Live Course Enrollment',
  description: 'Browse and enroll in live courses',
};

export default async function EnrollPage() {
  const content = await getWebsiteContent();
  if (!isLiveEnrollmentEnabled(content)) {
    notFound();
  }

  return (
    <Suspense
      fallback={<PublicCourseBrowseSkeleton label="Loading live courses" />}
    >
      <PublicEnrollClient />
    </Suspense>
  );
}
