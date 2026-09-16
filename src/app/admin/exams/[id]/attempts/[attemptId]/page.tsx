import type { Metadata } from 'next';
import AdminExamAttemptDetailPage from './AdminExamAttemptDetailClient';

export const metadata: Metadata = {
  title: 'Grade attempt',
};

export default function Page() {
  return <AdminExamAttemptDetailPage />;
}
