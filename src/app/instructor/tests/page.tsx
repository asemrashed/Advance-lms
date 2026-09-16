import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InstructorTestCreatorClient } from '@/components/exams/InstructorTestCreatorClient';

export const metadata: Metadata = {
  title: 'Test Creator',
};

export default function InstructorTestsPage() {
  return (
    <Suspense fallback={null}>
      <InstructorTestCreatorClient />
    </Suspense>
  );
}
