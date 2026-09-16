'use client';

import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import PlatformQuestionBankWorkspace from '@/components/platform-question-bank/PlatformQuestionBankWorkspace';
import { QuestionBankPageLayout } from '@/components/question-bank/QuestionBankPageLayout';

export default function AdminPlatformQuestionBankPage() {
  return (
    <AdminPageWrapper>
      <AdminRoleShell scroll={false}>
        <div className="flex h-svh min-h-0 flex-col overflow-hidden">
          <QuestionBankPageLayout className="min-h-0 flex-1">
            <PlatformQuestionBankWorkspace
              role="admin"
              title="Platform Question Bank"
              description="Subject/topic questions for batches, Test Yourself, and resources — separate from course QB"
            />
          </QuestionBankPageLayout>
        </div>
      </AdminRoleShell>
    </AdminPageWrapper>
  );
}
