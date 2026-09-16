'use client';

import AdminPageWrapper from '@/components/AdminPageWrapper';
import ExamAttemptGradeView from '@/components/ExamAttemptGradeView';

export default function AdminExamAttemptDetailPage() {
  return (
    <AdminPageWrapper>
      <ExamAttemptGradeView variant="admin" />
    </AdminPageWrapper>
  );
}
