import type { Metadata } from 'next';
import { InstructorCreateCourseFlow } from '@/components/courses/InstructorCreateCourseFlow';

export const metadata: Metadata = {
  title: 'Create Course & Batch',
};

export default function InstructorCourseCreateRoutePage() {
  return <InstructorCreateCourseFlow />;
}
