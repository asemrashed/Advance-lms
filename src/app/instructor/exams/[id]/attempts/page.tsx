import type { Metadata } from 'next';
import InstructorExamAttemptsPage from './InstructorExamAttemptsClient';

export const metadata: Metadata = {
  title: 'Exam attempts',
};

export default function Page() {
  return <InstructorExamAttemptsPage />;
}
