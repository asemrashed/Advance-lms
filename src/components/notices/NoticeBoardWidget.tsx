'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PageSection from '@/components/dashboard/lp/PageSection';
import { NoticeBoardSection } from '@/components/academic-hub/NoticeBoardSection';

/** @deprecated Use NoticeBoardSection or BatchAcademicPreviewGrid */
export function NoticeBoardWidget({
  limit = 6,
  manageHref,
  title = 'Notice board',
  description = 'Announcements from platform, subjects, and teachers',
}: {
  limit?: number;
  manageHref?: string;
  title?: string;
  description?: string;
}) {
  return (
    <PageSection title={title} description={description} className="mt-4">
      {manageHref ? (
        <div className="mb-3 flex justify-end">
          <Button asChild size="sm" variant="outline">
            <Link href={manageHref}>Manage notices</Link>
          </Button>
        </div>
      ) : null}
      <NoticeBoardSection maxItems={limit} />
    </PageSection>
  );
}
