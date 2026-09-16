import type { Metadata } from 'next';
import InstructorExamAttemptDetailPage from './InstructorExamAttemptDetailClient';

export const metadata: Metadata = {
  title: 'Grade attempt',
};

export default function Page() {
  return <InstructorExamAttemptDetailPage />;
}
