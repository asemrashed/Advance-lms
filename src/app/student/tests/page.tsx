import type { Metadata } from 'next';
import { TestYourselfBrowseClient } from '@/components/resources/TestYourselfBrowseClient';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import {
  StudentPage,
  StudentTopbar,
} from '@/components/student-panel/StudentPanelPrimitives';

export const metadata: Metadata = {
  title: 'Tests',
};

export default function StudentTestsPage() {
  return (
    <StudentRoleShell>
      <StudentPage>
        <StudentTopbar
          title="Tests"
          subtitle="Practise by topic, resume saved sessions, and review your results"
        />
        <TestYourselfBrowseClient context="student" showPageHeader={false} />
      </StudentPage>
    </StudentRoleShell>
  );
}
