'use client';
import { useCallback, useEffect, useState } from 'react';
import { LuFileSpreadsheet, LuFileText, LuLock, LuLockOpen, LuClock } from 'react-icons/lu';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import { Button } from '@/components/ui/button';
import EnrollmentDataTable from '@/components/EnrollmentDataTable';
import { exportRowsToExcel, exportRowsToPdf } from '@/lib/exportTable';
import { enrollmentsStaffService } from '@/services/enrollmentsStaffService';
import { coursesStaffService } from '@/services/coursesStaffService';
import type { Enrollment, EnrollmentStats } from '@/types/enrollment';
import {
  InstructorCard,
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { EnrollRequestsPanel } from '@/components/enrollments/EnrollRequestsPanel';
import { DiscountRequestsPanel } from '@/components/enrollments/DiscountRequestsPanel';
import { EnrollmentOverviewStats } from '@/components/staff/EnrollmentOverviewStats';
import { EnrollmentStaffFilters } from '@/components/staff/EnrollmentStaffFilters';
import { StaffChipTabs, StaffFilterGrid } from '@/components/staff/StaffResponsive';
import { INSTRUCTOR_GRACE_DAYS } from '@/lib/subscription/plan';

const empty: EnrollmentStats = {
  total: 0,
  active: 0,
  completed: 0,
  dropped: 0,
  suspended: 0,
  paid: 0,
  pending: 0,
  failed: 0,
  totalRevenue: 0,
  averageProgress: 0,
  completionRate: 0,
  dropRate: 0,
};
const emptyPages = { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false };
type Filter = 'all' | Enrollment['paymentStatus'];

function Content() {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState(empty);
  const [pages, setPages] = useState(emptyPages);
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState('all');
  const [courses, setCourses] = useState<Array<{ _id: string; title: string }>>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const p = new URLSearchParams({ page: String(page), limit: '10' });
      if (filter !== 'all') p.set('paymentStatus', filter);
      if (query) p.set('search', query);
      if (courseId !== 'all') p.set('course', courseId);
      const r = await enrollmentsStaffService.listInstructorEnrollments(p.toString());
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to load enrollments');
      setRows(j.data?.enrollments || []);
      setPages(j.data?.pagination || emptyPages);
      if (filter === 'all' && !query && courseId === 'all') setStats(j.data?.stats || empty);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load enrollments');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filter, page, query, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const r = await coursesStaffService.listCourses('limit=500&page=1');
        const j = await r.json();
        if (r.ok) setCourses(j.data?.courses || j.courses || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const patchEnrollment = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const r = await enrollmentsStaffService.updateInstructorEnrollment(id, body);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Update failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleBlock = (r: Enrollment) => patchEnrollment(r._id, { accessBlocked: !r.accessBlocked });
  const grantGrace = (r: Enrollment) => {
    const d = new Date();
    d.setDate(d.getDate() + INSTRUCTOR_GRACE_DAYS);
    patchEnrollment(r._id, { paymentDueAt: d.toISOString() });
  };

  const exportRows = (kind: 'excel' | 'pdf') => {
    const headers = ['Student', 'Email', 'Course', 'Amount', 'Method', 'Status', 'Access', 'Date'];
    const data = rows.map((r) => {
      const n = r.studentInfo?.name || 'Unknown';
      const c = r.courseInfo || r.courseLuInfo;
      return [
        n,
        r.studentInfo?.email || '',
        c?.title || 'Course',
        r.paymentAmount || 0,
        r.paymentMethod || '',
        r.paymentStatus,
        r.accessBlocked ? 'Blocked' : 'Active',
        new Date(r.enrolledAt).toLocaleDateString(),
      ];
    });
    if (kind === 'excel') exportRowsToExcel('enrollments', headers, data);
    else exportRowsToPdf('enrollments', 'Enrollments', headers, data);
  };

  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <InstructorCard title="Overview">
        <EnrollmentOverviewStats stats={stats} loading={loading && !rows.length} />
      </InstructorCard>
      <div className="space-y-3">
        <EnrollRequestsPanel />
        <DiscountRequestsPanel />
      </div>
      <InstructorCard title="Enrollment Transactions">
        <div className="mb-4 min-w-0 space-y-3">
          <StaffFilterGrid className="sm:grid-cols-2 xl:grid-cols-2">
            <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => exportRows('excel')}>
              <LuFileSpreadsheet className="mr-1" />
              Excel
            </Button>
            <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => exportRows('pdf')}>
              <LuFileText className="mr-1" />
              PDF
            </Button>
          </StaffFilterGrid>
          <EnrollmentStaffFilters
            searchDraft={draft}
            onSearchDraftChange={setDraft}
            onApplySearch={() => {
              setQuery(draft.trim());
              setPage(1);
            }}
            onClearSearch={() => {
              setDraft('');
              setQuery('');
              setPage(1);
            }}
            courseId={courseId}
            onCourseChange={(v) => {
              setCourseId(v);
              setPage(1);
            }}
            courses={courses}
            loading={loading}
          />
          <StaffChipTabs
            tabs={[
              { id: 'all', label: 'All', count: stats.total },
              { id: 'paid', label: 'Paid', count: stats.paid },
              { id: 'pending', label: 'Unpaid', count: stats.pending },
              { id: 'failed', label: 'Failed', count: stats.failed },
            ]}
            value={filter}
            onChange={(v) => {
              setFilter(v as Filter);
              setPage(1);
            }}
          />
        </div>
        <EnrollmentDataTable
          enrollments={rows}
          loading={loading}
          pagination={pages}
          onPageChange={setPage}
          variant="table"
          showAccess
          extraActions={[
            {
              key: 'block',
              label: (r) => (r.accessBlocked ? 'Unblock access' : 'Block access'),
              icon: (r) =>
                r.accessBlocked ? <LuLockOpen className="h-4 w-4" /> : <LuLock className="h-4 w-4" />,
              onClick: (r) => {
                if (busyId === r._id) return;
                toggleBlock(r);
              },
              variant: 'secondary',
            },
            {
              key: 'grace',
              label: 'Grant 7 days grace',
              icon: <LuClock className="h-4 w-4" />,
              onClick: (r) => {
                if (busyId === r._id) return;
                grantGrace(r);
              },
              variant: 'secondary',
            },
          ]}
        />
      </InstructorCard>
    </>
  );
}

export default function InstructorEnrollmentsPage() {
  return (
    <InstructorPageWrapper>
      <InstructorRoleShell>
        <InstructorPage>
          <InstructorTopbar title="Enrollments" subtitle="Student enrollment & payment records" />
          <Content />
        </InstructorPage>
      </InstructorRoleShell>
    </InstructorPageWrapper>
  );
}
