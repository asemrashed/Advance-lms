import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InstructorCreateCourseFlow } from '@/components/courses/InstructorCreateCourseFlow';
import { RoleAreaPageSkeleton } from '@/components/skeletons/DashboardSkeletons';

export const metadata: Metadata = {
  title: 'Edit Course',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InstructorCourseEditPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<RoleAreaPageSkeleton />}>
      <InstructorCreateCourseFlow mode="edit" initialCourseId={id} />
    </Suspense>
  );
}
