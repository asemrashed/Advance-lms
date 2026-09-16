'use client';

import { useState } from 'react';
import { AssignmentSubmission } from '@/types/assignment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LuEye as Eye, LuFileText as LuFileText, LuDownload as Download, LuUser as User, LuCalendar as Calendar, LuTarget as Target, LuMessageSquare as MessageSquare, LuPencil as Edit, LuTrash2 as Trash2 } from 'react-icons/lu';
import { format } from 'date-fns';
import DataTable, { Column, Action } from '@/components/ui/data-table';

interface AssignmentSubmissionDataTableProps {
  submissions: AssignmentSubmission[];
  loading: boolean;
  onGrade?: (submission: AssignmentSubmission) => void;
  onView?: (submission: AssignmentSubmission) => void;
  onDownload?: (submission: AssignmentSubmission) => void;
  onDelete?: (submission: AssignmentSubmission) => void;
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
    case 'draft':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Draft</Badge>;
    case 'submitted':
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Submitted</Badge>;
    case 'graded':
      return <Badge variant="default" className="bg-green-100 text-green-800">Graded</Badge>;
    case 'returned':
      return <Badge variant="default" className="bg-purple-100 text-purple-800">Returned</Badge>;
    default:
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Unknown</Badge>;
  }
};

const getGradeBadge = (score: number | undefined, maxScore: number) => {
  if (score === undefined) return <Badge variant="outline">Not Graded</Badge>;
  
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 90) {
    return <Badge className="bg-green-100 text-green-800">A+ ({score}/{maxScore})</Badge>;
  } else if (percentage >= 80) {
    return <Badge className="bg-green-100 text-green-800">A ({score}/{maxScore})</Badge>;
  } else if (percentage >= 70) {
    return <Badge className="bg-yellow-100 text-yellow-800">B ({score}/{maxScore})</Badge>;
  } else if (percentage >= 60) {
    return <Badge className="bg-orange-100 text-orange-800">C ({score}/{maxScore})</Badge>;
  } else {
    return <Badge className="bg-red-100 text-red-800">F ({score}/{maxScore})</Badge>;
  }
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'No date';
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
};

export default function AssignmentSubmissionDataTable({
  submissions,
  loading,
  onGrade,
  onView,
  onDownload,
  onDelete,
  pagination,
  onPageChange,
  variant = 'table'
}: AssignmentSubmissionDataTableProps) {
  const columns: Column<AssignmentSubmission>[] = [
    {
      key: 'student',
      label: 'Student',
      width: 'w-2/5',
      render: (submission) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {typeof submission.student === 'object' ? (submission.student as any).name : 'Unknown Student'}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {typeof submission.student === 'object' ? (submission.student as any).email : ''}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (submission) => (
        <div className="flex items-center gap-2">
          {getStatusBadge(submission.status)}
          {submission.isLate && (
            <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs">
              Late
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'grade',
      label: 'Grade',
      width: 'w-1/6',
      render: (submission) => getGradeBadge(submission.score, submission.maxScore)
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      width: 'w-1/6',
      render: (submission) => (
        <div className="text-sm">
          {submission.submittedAt ? (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              {formatDate(submission.submittedAt)}
            </div>
          ) : (
            <span className="text-gray-400">Not submitted</span>
          )}
        </div>
      )
    },
    {
      key: 'attempt',
      label: 'Attempt',
      width: 'w-1/6',
      render: (submission) => (
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-gray-400" />
          <span className="text-sm font-medium">{submission.attemptNumber}</span>
        </div>
      )
    }
  ];

  const actions: Action<AssignmentSubmission>[] = [
    {
      key: 'view',
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      onClick: (s) => onView?.(s),
      variant: 'secondary'
    },
    {
      key: 'grade',
      label: 'Grade',
      icon: <Edit className="w-4 h-4" />,
      onClick: (s) => onGrade?.(s),
      variant: 'default'
    },
    {
      key: 'download',
      label: 'Download',
      icon: <Download className="w-4 h-4" />,
      onClick: (s) => onDownload?.(s),
      variant: 'secondary'
    },
    ...(onDelete
      ? [{
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: (s:any) => onDelete(s),
          variant: 'destructive' as const
        }]
      : [])
  ];

  const emptyState = {
    title: 'No submissions found',
    description: 'No students have submitted this assignment yet.',
    icon: <LuFileText className="w-10 h-10 text-blue-400" />
  };

  return (
    <DataTable
      data={submissions}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={emptyState}
      pagination={pagination ? { ...pagination, onPageChange: onPageChange! } : undefined}
      variant={variant === 'grid' ? 'cards' : 'table'}
      rowClassName=""
      getItemId={(s) => s._id}
      onRowClick={undefined}
      className=""
    />
  );
}
