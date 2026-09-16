'use client';

import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import ExamAttemptGradeView from '@/components/ExamAttemptGradeView';

export default function InstructorExamAttemptDetailPage() {
  return (
    <InstructorPageWrapper>
      <ExamAttemptGradeView variant="instructor" />
    </InstructorPageWrapper>
  );
}
