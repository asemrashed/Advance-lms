import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import Batch from '@/models/Batch';
import Course from '@/models/Course';
import { PublicEnrollDetailClient } from '@/components/enroll/PublicEnrollDetailClient';
import { getWebsiteContent } from '@/lib/website-content';
import { isLiveEnrollmentEnabled } from '@/lib/studentPortalSettings';

export const metadata: Metadata = {
  title: 'Batch details',
};

type PageProps = { params: Promise<{ id: string }> };

export default async function EnrollBatchDetailPage({ params }: PageProps) {
  const content = await getWebsiteContent();
  if (!isLiveEnrollmentEnabled(content)) {
    notFound();
  }

  const { id } = await params;

  try {
    await connectDB();
    const batch = await Batch.findById(id).select('courseId').lean();
    if (batch?.courseId) {
      redirect(`/enroll/course/${String(batch.courseId)}`);
    }

    const course = await Course.findById(id).select('courseType').lean();
    if (course?.courseType === 'live') {
      redirect(`/enroll/course/${id}`);
    }
  } catch {
    // Fall through to legacy standalone batch page
  }

  return <PublicEnrollDetailClient batchId={id} />;
}
