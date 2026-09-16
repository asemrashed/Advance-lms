import type { Metadata } from 'next';
import { Suspense } from 'react';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import { BatchToCourseBuilderRedirect } from '@/components/batches/BatchToCourseBuilderRedirect';

export const metadata: Metadata = {
  title: 'Batch detail',
};

export default async function InstructorBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <InstructorPageWrapper>
      <Suspense
        fallback={
          <p className="p-6 text-muted-foreground">Opening course builder…</p>
        }
      >
        <BatchToCourseBuilderRedirect batchId={id} role="instructor" />
      </Suspense>
    </InstructorPageWrapper>
  );
}
