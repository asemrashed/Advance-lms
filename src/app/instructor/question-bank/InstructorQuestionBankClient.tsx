'use client';

import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import CourseQuestionBankWorkspace from '@/components/question-bank/CourseQuestionBankWorkspace';
import { QuestionBankPageLayout } from '@/components/question-bank/QuestionBankPageLayout';

export default function InstructorQuestionBankPage() {
  return (
    <InstructorPageWrapper>
      <InstructorRoleShell scroll={false}>
        <div className="flex h-svh min-h-0 flex-col overflow-hidden">
          <QuestionBankPageLayout className="min-h-0 flex-1">
            <CourseQuestionBankWorkspace
              role="instructor"
              title="Question Bank"
              description="AI-tagged questions from Cambridge past papers"
            />
          </QuestionBankPageLayout>
        </div>
      </InstructorRoleShell>
    </InstructorPageWrapper>
  );
}
