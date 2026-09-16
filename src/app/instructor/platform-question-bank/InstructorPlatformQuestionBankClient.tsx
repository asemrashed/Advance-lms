'use client';

import Link from 'next/link';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import { Button } from '@/components/ui/button';
import { LuLibrary, LuArrowLeft } from 'react-icons/lu';
import {
  InstructorCard,
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';

/**
 * Instructors no longer use a dedicated Platform QB workspace.
 * Access is requested from Course Question Bank via "Borrow from the Platform".
 */
export default function InstructorPlatformQuestionBankPage() {
  return (
    <InstructorPageWrapper>
      <InstructorRoleShell>
        <InstructorPage>
          <InstructorTopbar
            title="Platform Question Bank"
            subtitle="Access platform-authored questions through your instructor bank"
          />
          <InstructorCard title="Borrow platform questions" className="mx-auto max-w-2xl">
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LuLibrary className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Direct access is restricted</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Use <strong>Borrow from the Platform</strong> in Question Bank to request access
                  by subject and topic. Approved questions are copied into your bank and remain
                  editable there.
                </p>
              </div>
              <Button asChild>
                <Link href="/instructor/question-bank">
                  <LuArrowLeft className="mr-1.5 h-4 w-4" />
                  Go to Question Bank
                </Link>
              </Button>
            </div>
          </InstructorCard>
        </InstructorPage>
      </InstructorRoleShell>
    </InstructorPageWrapper>
  );
}
