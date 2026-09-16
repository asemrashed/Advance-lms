import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CourseDetailClient } from '@/app/course/[id]/CourseDetailClient';
import { getWebsiteContent } from '@/lib/website-content';
import { isLiveEnrollmentEnabled } from '@/lib/studentPortalSettings';

export const metadata: Metadata = {
  title: 'Live course details',
};

type PageProps = { params: Promise<{ courseId: string }> };

export default async function EnrollLiveCoursePage({ params }: PageProps) {
  const content = await getWebsiteContent();
  if (!isLiveEnrollmentEnabled(content)) {
    notFound();
  }

  const { courseId } = await params;
  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-16">
      <CourseDetailClient courseId={courseId} liveEnroll />
    </div>
  );
}
