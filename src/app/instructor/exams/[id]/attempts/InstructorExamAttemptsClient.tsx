'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import ExamAttemptDataTable, { type ExamAttemptRow } from '@/components/ExamAttemptDataTable';
import PageSection from '@/components/PageSection';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import {
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { Button } from '@/components/ui/button';
import { AttractiveSelect } from '@/components/ui/attractive-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { examsStaffService } from '@/services/examsStaffService';
import { LuX as X, LuSettings as Settings } from 'react-icons/lu';
import ExamAttemptViewModal from '@/components/exams/ExamAttemptViewModal';

interface ExamBrief {
  _id: string;
  title: string;
  type: string;
  totalMarks: number;
  passingMarks: number;
}

function InstructorExamAttemptsPageContent() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamBrief | null>(null);
  const [attempts, setAttempts] = useState<ExamAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingAttempt, setViewingAttempt] = useState<ExamAttemptRow | null>(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'in_progress' | 'completed' | 'pending_review' | 'abandoned' | 'timeout',
    page: 1,
    limit: 20,
    sortBy: 'createdAt' as 'createdAt' | 'submittedAt' | 'percentage',
    sortOrder: 'desc' as 'asc' | 'desc',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const fetchExam = async () => {
    const res = await examsStaffService.getInstructorExam(examId);
    const data = await res.json();
    if (res.ok) {
      const e = data.data?.exam || data.exam;
      setExam(e ? { _id: e._id, title: e.title, type: e.type, totalMarks: e.totalMarks, passingMarks: e.passingMarks } : null);
    } else setExam(null);
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
        ...(filters.status !== 'all' && { status: filters.status }),
        sortBy: filters.sortBy === 'submittedAt' ? 'submittedAt' : filters.sortBy,
        sortOrder: filters.sortOrder,
      });
      const res = await examsStaffService.listInstructorExamAttempts(examId, q.toString());
      const data = await res.json();
      if (res.ok) {
        setAttempts(data.data?.attempts || []);
        setPagination(data.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } else {
        setAttempts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExam();
  }, [examId]);

  useEffect(() => {
    fetchAttempts();
  }, [examId, filters]);

  const handlePageChange = (page: number) => setFilters((p) => ({ ...p, page }));

  const handleFilterChange = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setShowFilterDrawer(false);
  };

  const getActiveFiltersCount = () => {
    let c = 0;
    if (filters.status !== 'all') c++;
    if (filters.sortBy !== 'createdAt') c++;
    if (filters.sortOrder !== 'desc') c++;
    return c;
  };

  const handleDownload = (row: ExamAttemptRow) => {
    const blob = new Blob([JSON.stringify(row, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-attempt-${row._id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleView = (row: ExamAttemptRow) => {
    setViewingAttempt(row);
  };

  const handleGrade = (row: ExamAttemptRow) => {
    router.push(`/instructor/exams/${examId}/attempts/${row._id}`);
  };

  return (
    <InstructorRoleShell>
      <InstructorPage className="p-2 sm:p-4">
        <InstructorTopbar
          title={exam ? `Attempts — ${exam.title}` : 'Exam attempts'}
          subtitle="View and grade student exam attempts"
        />

        <PageSection title="Exam details" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Type</span>
              <p className="font-semibold capitalize">{exam?.type?.replace('_', ' ')}</p>
            </div>
            <div>
              <span className="text-gray-500">Total marks</span>
              <p className="font-semibold">{exam?.totalMarks}</p>
            </div>
            <div>
              <span className="text-gray-500">Passing marks</span>
              <p className="font-semibold">{exam?.passingMarks}</p>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Student attempts"
          description={
            getActiveFiltersCount() > 0
              ? `Page ${pagination.page} — ${pagination.total} total`
              : `All attempts (${pagination.total} total)`
          }
          actions={
            <Button variant="outline" onClick={() => setShowFilterDrawer(true)} className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Filters
              {getActiveFiltersCount() > 0 && <span className="text-xs font-bold">({getActiveFiltersCount()})</span>}
            </Button>
          }
        >
          <ExamAttemptDataTable
            attempts={attempts}
            loading={loading}
            onView={handleView}
            onGrade={handleGrade}
            onDownload={handleDownload}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </PageSection>

        <Sheet open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <AttractiveSelect
                label="Status"
                icon="tag"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                colorScheme="primary"
                size="md"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'in_progress', label: 'In progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'pending_review', label: 'Pending review' },
                  { value: 'abandoned', label: 'Abandoned' },
                  { value: 'timeout', label: 'Timeout' },
                ]}
              />
              <AttractiveSelect
                label="Sort by"
                icon="arrow"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                colorScheme="primary"
                size="md"
                options={[
                  { value: 'createdAt', label: 'Created' },
                  { value: 'submittedAt', label: 'Submitted' },
                  { value: 'percentage', label: 'Score %' },
                ]}
              />
              <AttractiveSelect
                label="Order"
                icon="arrow"
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                colorScheme="primary"
                size="md"
                options={[
                  { value: 'desc', label: 'Descending' },
                  { value: 'asc', label: 'Ascending' },
                ]}
              />
            </div>
            <SheetFooter className="flex gap-2">
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button onClick={() => setShowFilterDrawer(false)}>Apply</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </InstructorPage>

      <ExamAttemptViewModal
        open={Boolean(viewingAttempt)}
        examId={examId}
        attempt={viewingAttempt}
        apiBase="/api/instructor/exams"
        onClose={() => setViewingAttempt(null)}
      />
    </InstructorRoleShell>
  );
}

export default function InstructorExamAttemptsPage() {
  return (
    <InstructorPageWrapper>
      <InstructorExamAttemptsPageContent />
    </InstructorPageWrapper>
  );
}
