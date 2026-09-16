import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InstructorMaterialsClient } from '@/components/courses/InstructorMaterialsClient';
import { RoleAreaPageSkeleton } from '@/components/skeletons/DashboardSkeletons';

export const metadata: Metadata = {
  title: 'Curriculum Builder',
};

export default function AdminMaterialsPage() {
  return (
    <Suspense fallback={<RoleAreaPageSkeleton />}>
      <InstructorMaterialsClient role="admin" />
    </Suspense>
  );
}
