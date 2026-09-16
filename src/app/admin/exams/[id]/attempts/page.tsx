import type { Metadata } from 'next';
import AdminExamAttemptsPage from './AdminExamAttemptsClient';

export const metadata: Metadata = {
  title: 'Exam attempts',
};

export default function Page() {
  return <AdminExamAttemptsPage />;
}
