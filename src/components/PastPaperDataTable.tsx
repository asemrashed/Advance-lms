'use client';

import { PastPaper } from '@/types/past-paper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import {
  LuPencil as Edit,
  LuTrash2 as Trash2,
  LuEye as Eye,
  LuFileText as LuFileText,
  LuDownload as Download,
} from 'react-icons/lu';
import { format } from 'date-fns';

interface PastPaperDataTableProps {
  pastPapers: PastPaper[];
  loading: boolean;
  onEdit: (paper: PastPaper) => void;
  onDelete: (paper: PastPaper) => void;
  onView?: (paper: PastPaper) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
}

function PaperFileCell({
  url,
  label,
}: {
  url?: string | null;
  label: string;
}) {
  if (!url) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <Button asChild size="sm" variant="outline" className="h-8 gap-1">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Download className="h-3.5 w-3.5" />
        {label}
      </a>
    </Button>
  );
}

export default function PastPaperDataTable({
  pastPapers,
  loading,
  onEdit,
  onDelete,
  onView,
  pagination,
  onPageChange,
  variant = 'table',
}: PastPaperDataTableProps) {
  const getStatusBadge = (isActive: boolean | undefined) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const columns: Column<PastPaper>[] = [
    {
      key: 'paper',
      label: 'Past Paper',
      width: 'w-1/4',
      render: (paper) => (
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)',
              }}
            >
              <LuFileText className="h-5 w-5" />
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                paper.isActive ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {paper.sessionName} · {paper.year} — {paper.subject}
            </h3>
            <p className="truncate text-xs text-gray-500">
              Variant: {paper.examType}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'qp',
      label: 'QP',
      width: 'w-1/6',
      render: (paper) => (
        <PaperFileCell url={paper.questionPaperUrl} label="QP" />
      ),
    },
    {
      key: 'ms',
      label: 'MS',
      width: 'w-1/6',
      render: (paper) => (
        <PaperFileCell url={paper.marksPdfUrl} label="MS" />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (paper) => <div>{getStatusBadge(paper.isActive)}</div>,
    },
    {
      key: 'created',
      label: 'Created',
      width: 'w-1/6',
      render: (paper) => (
        <div className="text-sm text-gray-600">{formatDate(paper.createdAt)}</div>
      ),
    },
  ];

  const actions: Action<PastPaper>[] = [
    ...(onView
      ? [
          {
            key: 'view',
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            onClick: onView,
            variant: 'default' as const,
          },
        ]
      : []),
    {
      key: 'edit',
      label: 'Edit Past Paper',
      icon: <Edit className="h-4 w-4" />,
      onClick: onEdit,
      variant: 'default' as const,
    },
    {
      key: 'delete',
      label: 'Delete Past Paper',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'destructive' as const,
    },
  ];

  const emptyState = {
    title: 'No past papers found',
    description: 'Get started by adding a new past paper to the system.',
    icon: (
      <svg
        className="h-10 w-10"
        style={{ color: '#A855F7' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  };

  return (
    <DataTable
      data={pastPapers}
      columns={columns}
      actions={actions}
      loading={loading}
      pagination={{
        ...pagination,
        onPageChange,
      }}
      emptyState={emptyState}
      variant={variant}
    />
  );
}
