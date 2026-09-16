'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  InstructorCard,
  InstructorEmptyState,
  InstructorLoadingState,
  InstructorPage,
  InstructorStatusBadge,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import { Button } from '@/components/ui/button';
import { batchesService, type BatchRecord } from '@/services/batchesService';
import { LuBell, LuBookOpen, LuUsers } from 'react-icons/lu';

export default function InstructorMessagesClient() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await batchesService.listBatches('limit=100');
        if (response.success && response.data?.batches) {
          setBatches(response.data.batches);
        } else {
          setError(response.error || 'Unable to load your batches');
        }
      } catch {
        setError('Unable to load your batches');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="Course Communication"
          subtitle="Choose a class to publish an announcement or review its students"
        />

        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Communication happens by course</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Post verified updates on the notice board. Direct chat is not enabled on this platform.
          </p>
        </div>

        {loading ? (
          <InstructorLoadingState label="Loading courses and batches…" />
        ) : error ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </p>
        ) : batches.length === 0 ? (
          <InstructorEmptyState
            message="No teaching batches are available yet"
            action={
              <Button asChild>
                <Link href="/instructor/courses">View courses</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {batches.map((batch) => (
              <InstructorCard
                key={batch._id}
                title={batch.name}
                actions={
                  <InstructorStatusBadge
                    status={batch.isActive ? 'success' : 'archived'}
                    label={batch.isActive ? 'Active' : 'Inactive'}
                  />
                }
                className="transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <LuBookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{batch.subject || 'Live course'}</p>
                      <p className="text-xs text-muted-foreground">
                        {batch.grade ? `Grade ${batch.grade}` : 'All grades'} ·{' '}
                        {batch.enrolledCount ?? 0} students
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild size="sm">
                      <Link href={`/instructor/notice-board?batchId=${batch._id}`}>
                        <LuBell className="mr-1.5 h-4 w-4" />
                        Notice board
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/instructor/students${
                          batch.courseId ? `?courseId=${batch.courseId}` : ''
                        }`}
                      >
                        <LuUsers className="mr-1.5 h-4 w-4" />
                        Students
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
