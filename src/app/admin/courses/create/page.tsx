import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InstructorCreateCourseFlow } from '@/components/courses/InstructorCreateCourseFlow';
import { RoleAreaPageSkeleton } from '@/components/skeletons/DashboardSkeletons';

export const metadata: Metadata = {
  title: 'Create course',
};

export default function AdminCourseCreateRoutePage() {
  return (
    <Suspense fallback={<RoleAreaPageSkeleton />}>
      <InstructorCreateCourseFlow role="admin" />
    </Suspense>
  );
}
