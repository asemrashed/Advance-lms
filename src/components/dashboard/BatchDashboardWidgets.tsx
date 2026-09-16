'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PageSection from '@/components/dashboard/lp/PageSection';
import {
  DashboardBatchCard,
  type DashboardBatchCardData,
} from '@/components/batches/DashboardBatchCard';
import type { StaffBatchDashboardSummary } from '@/types/dashboard';
import type { StudentDashboardRoutineDay } from '@/types/studentDashboard';
import { StaffAcademicPreviewGrid } from '@/components/academic-hub/BatchAcademicPreviewGrid';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LuCalendar, LuClipboardList } from 'react-icons/lu';

function BatchCardGrid({
  batches,
  manageBasePath,
}: {
  batches: DashboardBatchCardData[];
  manageBasePath: string;
}) {
  if (batches.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {batches.map((b) => (
        <DashboardBatchCard
          key={b._id}
          batch={b}
          manageHref={`${manageBasePath}/${b._id}`}
        />
      ))}
    </div>
  );
}

export function StudentBatchDashboardSection({
  weeklyRoutine,
}: {
  weeklyRoutine: StudentDashboardRoutineDay[];
}) {
  const routineRows = weeklyRoutine.flatMap((batch) =>
    batch.days.flatMap((day) =>
      day.slots.map((slot, index) => ({
        id: `${batch.batchId}-${day.dayOfWeek}-${index}`,
      batchName: batch.batchName,
        day: day.label,
      ...slot,
      })),
    ),
  );

  return (
    <PageSection
      title="Weekly routine"
      description="Your recurring class schedule"
      className="mt-2"
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Batch</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routineRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No routine slots configured.
                </TableCell>
              </TableRow>
            ) : (
              routineRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold">{row.batchName}</TableCell>
                  <TableCell>{row.day}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.startTime}–{row.endTime}
                  </TableCell>
                  <TableCell>{row.title || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
        <Link href="/student/schedule">
          <LuCalendar className="h-4 w-4" />
          View schedule
        </Link>
      </Button>
    </PageSection>
  );
}

export function StaffBatchDashboardSection({
  summary,
  batchesBasePath,
  roleLabel,
}: {
  summary: StaffBatchDashboardSummary;
  batchesBasePath: string;
  roleLabel: 'instructor' | 'admin';
}) {
  const attendanceHint =
    roleLabel === 'instructor'
      ? 'Open a batch → Live classes → Attendance tab to mark present/absent.'
      : 'Open any batch → Attendance tab on a live class.';

  const cardBatches: DashboardBatchCardData[] = summary.batches.slice(0, 6).map((b) => ({
    _id: b._id,
    name: b.name,
    grade: b.grade,
    shortDescription: b.shortDescription,
    thumbnailUrl: b.thumbnailUrl,
    fee: b.fee,
    enrolledCount: b.enrolledCount,
    maxStudents: b.maxStudents,
  }));

  const sectionTitle = 'Live course batches';
  const coursesHref =
    roleLabel === 'instructor' ? '/instructor/courses' : '/admin/courses';
  const batchManageBase = batchesBasePath;

  return (
    <PageSection
      title={sectionTitle}
      description="Live classes, routine, notices, and attendance"
      className="mt-2"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={coursesHref}>
            <LuCalendar className="mr-2 h-4 w-4" />
            All courses ({summary.totalBatches})
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/enroll">Public enroll page</Link>
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        <LuClipboardList className="mr-1 inline h-4 w-4" />
        {attendanceHint}
      </p>

      {cardBatches.length > 0 ? (
        <div className="mb-6">
          <BatchCardGrid batches={cardBatches} manageBasePath={batchManageBase} />
        </div>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">No active batches yet.</p>
      )}

      <StaffAcademicPreviewGrid
        noticeBoardHref={
          roleLabel === 'instructor' ? '/instructor/notice-board' : '/admin/notices'
        }
        upcomingClasses={summary.upcomingClasses}
        batchesHref={coursesHref}
      />
    </PageSection>
  );
}
