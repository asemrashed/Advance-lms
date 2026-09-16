'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LuSearch as Search, LuEye as Eye, LuRefreshCw as RefreshCw, LuCheck as CheckCircle2, LuX as XCircle, LuClock as Clock, LuGraduationCap as GraduationCap,  } from 'react-icons/lu';;
import { studentExamService } from '@/services/studentExamService';

interface AttemptRow {
  _id: string;
  exam: {
    _id: string;
    title: string;
    duration: number;
    totalMarks: number;
  };
  status: 'in_progress' | 'completed' | 'abandoned';
  score: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  createdAt: string;
  completedAt?: string;
}

export default function ExamHistoryPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'abandoned'>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const resp = await studentExamService.listExamAttemptsByQuery(params.toString());
      if (resp.ok) {
        const data = await resp.json();
        const rows: AttemptRow[] = data.data?.attempts || [];
        setAttempts(rows);
        setPagination(p => ({ ...p, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / p.limit)) }));
      }
    } catch (e) {
      console.error('Error fetching exam history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchAttempts();
  }, [session?.user?.id, statusFilter]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const filtered = useMemo(() => {
    let rows = attempts;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(a => a.exam?.title?.toLowerCase().includes(q));
    }
    return rows;
  }, [attempts, search]);

  const paged = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filtered.slice(start, start + pagination.limit);
  }, [filtered, pagination.page, pagination.limit]);

  const handlePageChange = (page: number) => setPagination(p => ({ ...p, page }));

  const columns: Column<AttemptRow>[] = [
    {
      key: 'exam',
      label: 'Exam',
      width: 'w-2/5',
      render: (row) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 text-sm">{row.exam?.title || 'Untitled Exam'}</div>
          <div className="text-xs text-gray-600 flex gap-3">
            <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {row.exam?.totalMarks} marks</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {row.exam?.duration} min</span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (row) => (
        row.status === 'completed' ? (
          <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1"/>Completed</Badge>
        ) : row.status === 'in_progress' ? (
          <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1"/>In Progress</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-800">Abandoned</Badge>
        )
      )
    },
    {
      key: 'score',
      label: 'Score',
      width: 'w-1/6',
      render: (row) => (
        row.status === 'completed' ? (
          <div className="font-semibold">{row.score} / {row.exam?.totalMarks}</div>
        ) : (
          <span className="text-gray-500 text-sm">—</span>
        )
      )
    },
    {
      key: 'percent',
      label: 'Percent',
      width: 'w-1/6',
      render: (row) => (
        row.status === 'completed' ? (
          <span className={`font-semibold ${row.passed ? 'text-green-600' : 'text-red-600'}`}>{row.percentage.toFixed(1)}%</span>
        ) : (
          <span className="text-gray-500 text-sm">—</span>
        )
      )
    },
    {
      key: 'time',
      label: 'Time Spent',
      width: 'w-1/6',
      render: (row) => (
        <span className="text-sm">{formatTime(row.timeSpent || 0)}</span>
      )
    },
  ];

  const actions: Action<AttemptRow>[] = [
    {
      key: 'view',
      label: 'View Results',
      icon: <Eye className="w-4 h-4" />,
      onClick: (row) => router.push(`/student/exams/${row.exam?._id}/results`),
      variant: 'default'
    },
    {
      key: 'retake',
      label: 'Retake',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: (row) => router.push(`/student/exams/${row.exam?._id}/take`),
      variant: 'secondary'
    }
  ];

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        <WelcomeSection title="Exam History" description="Review your past exam attempts and results" />

        <PageSection
          title="My Attempts"
          description="Browse completed and in-progress attempts"
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by exam title..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  className="pl-10 pr-10 w-full sm:w-64 border-2 border-blue-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant={statusFilter === 'all' ? 'default' : 'outline'} className="text-sm border-2 border-blue-300 hover:border-blue-400" onClick={() => { setStatusFilter('all'); setPagination(p => ({ ...p, page: 1 })); }}>All</Button>
                <Button type="button" variant={statusFilter === 'completed' ? 'default' : 'outline'} className="text-sm border-2 border-blue-300 hover:border-blue-400" onClick={() => { setStatusFilter('completed'); setPagination(p => ({ ...p, page: 1 })); }}>Completed</Button>
                <Button type="button" variant={statusFilter === 'in_progress' ? 'default' : 'outline'} className="text-sm border-2 border-blue-300 hover:border-blue-400" onClick={() => { setStatusFilter('in_progress'); setPagination(p => ({ ...p, page: 1 })); }}>In Progress</Button>
                <Button type="button" variant={statusFilter === 'abandoned' ? 'default' : 'outline'} className="text-sm border-2 border-blue-300 hover:border-blue-400" onClick={() => { setStatusFilter('abandoned'); setPagination(p => ({ ...p, page: 1 })); }}>Abandoned</Button>
              </div>
            </div>
          }
        >
          <DataTable
            data={paged}
            columns={columns}
            actions={actions}
            loading={loading}
            variant="table"
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              total: filtered.length,
              pages: Math.max(1, Math.ceil(filtered.length / pagination.limit)),
              onPageChange: handlePageChange
            }}
            emptyState={{
              title: 'No attempts found',
              description: 'You have not taken any exams yet.',
              icon: <GraduationCap className="h-12 w-12 text-gray-400" />
            }}
            className="mt-4"
          />
        </PageSection>
      </main>
    </StudentRoleShell>
  );
}


