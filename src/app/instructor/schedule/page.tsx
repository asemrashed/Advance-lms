import type { Metadata } from 'next';
import { InstructorScheduleClient } from '@/components/batches/InstructorScheduleClient';

export const metadata: Metadata = {
  title: 'Schedule',
};

export default function InstructorSchedulePage() {
  return <InstructorScheduleClient />;
}
