'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorCard,
  InstructorEmptyState,
  InstructorLoadingState,
  InstructorPage,
  InstructorStatusBadge,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { Button } from '@/components/ui/button';
import { batchesService, type BatchRecord } from '@/services/batchesService';
import { LuCalendar, LuExternalLink, LuUpload, LuUsers } from 'react-icons/lu';

export function InstructorBatchesClient() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await batchesService.listBatches('limit=100');
        if (res.success && res.data?.batches) {
          setBatches(res.data.batches);
        } else {
          setError(res.error || 'Failed to load batches');
        }
      } catch {
        setError('Failed to load batches');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="My Batches"
          subtitle="Sections you teach — schedule, materials, and live ops"
          actions={
            <Button asChild>
              <Link href="/instructor/courses/create">+ New course & batch</Link>
            </Button>
          }
        />

        {loading ? (
          <InstructorLoadingState label="Loading batches…" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : batches.length === 0 ? (
          <InstructorEmptyState
            message="No batches yet"
            action={
              <Button asChild>
                <Link href="/instructor/courses/create">Create a live course</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {batches.map((b) => (
              <InstructorCard
                key={b._id}
                title={b.name}
                actions={
                  <InstructorStatusBadge
                    status={b.isActive ? 'success' : 'archived'}
                    label={b.isActive ? 'Active' : 'Inactive'}
                  />
                }
                className="flex flex-col transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex min-h-40 flex-1 flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {b.subject || 'Live section'} · {b.grade ? `Grade ${b.grade}` : 'All grades'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LuUsers className="h-4 w-4" />
                    </span>
                    {b.enrolledCount ?? 0} / {b.maxStudents} students
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LuCalendar className="h-4 w-4" />
                    </span>
                    {b.startDate
                      ? new Date(b.startDate).toLocaleDateString()
                      : '—'}{' '}
                    →{' '}
                    {b.endDate ? new Date(b.endDate).toLocaleDateString() : '—'}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    {b.courseId ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/instructor/materials?courseId=${b.courseId}&batchId=${b._id}`}
                        >
                          Schedule & live
                          <LuExternalLink className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        href={`/instructor/materials?batchId=${b._id}${
                          b.courseId ? `&courseId=${b.courseId}` : ''
                        }`}
                      >
                        <LuUpload className="mr-1 h-3.5 w-3.5" />
                        Materials
                      </Link>
                    </Button>
                  </div>
                </div>
              </InstructorCard>
            ))}
          </div>
        )}
      </InstructorPage>
    </InstructorRoleShell>
  );
}
