'use client';

import { Badge } from '@/components/ui/badge';
import { LuEye as Eye, LuDownload as Download, LuUser as User, LuCalendar as Calendar, LuTarget as Target, LuPencil as Edit, LuTrash2 as Trash2 } from 'react-icons/lu';
import { format } from 'date-fns';
import DataTable, { Column, Action } from '@/components/ui/data-table';

export type ExamAttemptRow = {
  _id: string;
  exam: string;
  student: { _id: string; name: string; email: string };
  status: string;
  score?: number;
  maxScore: number;
  percentage: number;
  attemptNumber: number;
  submittedAt?: string;
  startedAt?: string;
  isPassed?: boolean;
};

interface ExamAttemptDataTableProps {
  attempts: ExamAttemptRow[];
  loading: boolean;
  onGrade?: (row: ExamAttemptRow) => void;
  onView?: (row: ExamAttemptRow) => void;
  onDownload?: (row: ExamAttemptRow) => void;
  onDelete?: (row: ExamAttemptRow) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
  variant?: 'table' | 'grid';
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending_review':
      return <Badge className="bg-amber-100 text-amber-900">Pending review</Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-800">In progress</Badge>;
    case 'completed':
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    case 'abandoned':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Abandoned</Badge>;
    case 'timeout':
      return <Badge variant="destructive" className="bg-red-100 text-red-800">Timeout</Badge>;
    default:
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">{status}</Badge>;
  }
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '—';
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
};

export default function ExamAttemptDataTable({
  attempts,
  loading,
  onGrade,
  onView,
  onDownload,
  onDelete,
  pagination,
  onPageChange,
  variant = 'table',
}: ExamAttemptDataTableProps) {
  const columns: Column<ExamAttemptRow>[] = [
    {
      key: 'student',
      label: 'Student',
      width: 'w-2/5',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{row.student?.name || 'Unknown'}</div>
            <div className="text-sm text-gray-500 truncate">{row.student?.email || ''}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (row) => <div className="flex items-center gap-2">{getStatusBadge(row.status)}</div>,
    },
    {
      key: 'grade',
      label: 'Score',
      width: 'w-1/6',
      render: (row) =>
        row.status === 'completed' || row.status === 'pending_review' ? (
          <Badge variant="outline" className="bg-purple-50 text-purple-900">
            {Number(row.percentage || 0).toFixed(1)}%
          </Badge>
        ) : (
          <Badge variant="outline">—</Badge>
        ),
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      width: 'w-1/6',
      render: (row) => (
        <div className="text-sm flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          {formatDate(row.submittedAt)}
        </div>
      ),
    },
    {
      key: 'attempt',
      label: 'Attempt',
      width: 'w-1/6',
      render: (row) => (
        <div className="flex items-center gap-1 text-sm font-medium">
          <Target className="w-3 h-3 text-gray-400" />
          {row.attemptNumber}
        </div>
      ),
    },
  ];

  const actions: Action<ExamAttemptRow>[] = [
    {
      key: 'view',
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      onClick: (r) => onView?.(r),
      variant: 'secondary',
    },
    {
      key: 'grade',
      label: 'Grade',
      icon: <Edit className="w-4 h-4" />,
      onClick: (r) => onGrade?.(r),
      variant: 'default',
    },
    {
      key: 'download',
      label: 'Download',
      icon: <Download className="w-4 h-4" />,
      onClick: (r) => onDownload?.(r),
      variant: 'secondary',
    },
    ...(onDelete
      ? [
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: (r: ExamAttemptRow) => onDelete(r),
            variant: 'destructive' as const,
          },
        ]
      : []),
  ];

  const emptyState = {
    title: 'No attempts found',
    description: 'No students have attempted this exam yet.',
    icon: <User className="w-10 h-10 text-gray-400" />,
  };

  return (
    <DataTable
      data={attempts}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={emptyState}
      pagination={pagination && onPageChange ? { ...pagination, onPageChange } : undefined}
      variant={variant === 'grid' ? 'cards' : 'table'}
      getItemId={(r) => r._id}
    />
  );
}
