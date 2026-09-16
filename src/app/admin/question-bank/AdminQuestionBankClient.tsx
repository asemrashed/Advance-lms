'use client';

import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import CourseQuestionBankWorkspace from '@/components/question-bank/CourseQuestionBankWorkspace';
import { QuestionBankPageLayout } from '@/components/question-bank/QuestionBankPageLayout';

export default function QuestionBankPage() {
  return (
    <AdminPageWrapper>
      <AdminRoleShell scroll={false}>
        <QuestionBankPageLayout>
          <CourseQuestionBankWorkspace
            role="admin"
            title="Question Bank"
            description="Organize and manage course questions by course and chapter"
          />
        </QuestionBankPageLayout>
      </AdminRoleShell>
    </AdminPageWrapper>
  );
}
