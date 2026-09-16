import type { Metadata } from 'next';
import InstructorMessagesClient from './InstructorMessagesClient';

export const metadata: Metadata = {
  title: 'Instructor communication',
};

export default function InstructorMessagesPage() {
  return <InstructorMessagesClient />;
}
