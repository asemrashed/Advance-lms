import type { Metadata } from 'next';
import { InstructorBatchesClient } from '@/components/batches/InstructorBatchesClient';

export const metadata: Metadata = {
  title: 'My Batches',
};

export default function InstructorBatchesPage() {
  return <InstructorBatchesClient />;
}
