import type { Metadata } from 'next';
import { Suspense } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { BatchToCourseBuilderRedirect } from '@/components/batches/BatchToCourseBuilderRedirect';

export const metadata: Metadata = {
  title: 'Batch detail',
};

export default async function AdminBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminPageWrapper>
      <Suspense
        fallback={
          <p className="p-6 text-muted-foreground">Opening course builder…</p>
        }
      >
        <BatchToCourseBuilderRedirect batchId={id} role="admin" />
      </Suspense>
    </AdminPageWrapper>
  );
}
