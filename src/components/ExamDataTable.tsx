'use client';

import { Exam } from '@/types/exam';
import { Badge } from '@/components/ui/badge';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { LuPencil as Edit, LuTrash2 as Trash2, LuEye as Eye, LuClock as Clock, LuUsers as Users, LuAward as Award, LuBookOpen as BookOpen, LuCalendar as Calendar, LuTarget as Target, LuCheck as CheckCircle, LuX as XCircle } from 'react-icons/lu';;
import { format } from 'date-fns';
import { getPlainTextPreview } from '@/lib/utils';

interface ExamDataTableProps {
  exams: Exam[];
  loading: boolean;
  onEdit: (exam: Exam) => void;
  onDelete: (exam: Exam) => void;
  onView?: (exam: Exam) => void;
  onViewAttempts?: (exam: Exam) => void;
  onManageQuestions?: (exam: Exam) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
}

export default function ExamDataTable({
  exams,
  loading,
  onEdit,
  onDelete,
  onView,
  onViewAttempts,
  onManageQuestions,
  pagination,
  onPageChange,
  variant = 'table'
}: ExamDataTableProps) {
  const getStatusBadge = (exam: Exam) => {
    const status = exam.status || 'draft';
    
    switch (status) {
      case 'published':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Published
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <BookOpen className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <Calendar className="w-3 h-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            Unknown
          </Badge>
        );
    }
  };

  const getTypeBadge = (exam: Exam) => {
    const colors = {
      mcq: 'bg-blue-100 text-blue-800',
      written: 'bg-purple-100 text-purple-800',
      mixed: 'bg-green-100 text-green-800'
    };

    const key = exam.type as keyof typeof colors;
    const cls = colors[key] ?? colors.mcq;

    return (
      <Badge variant="outline" className={cls}>
        {exam.type?.toUpperCase() || 'N/A'}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "N/A";
  
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "N/A";
  
    return format(d, "MMM dd, yyyy");
  };

  const formatDateTime = (date?: Date | string | null) => {
    if (!date) return "N/A";
  
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "N/A";
  
    return format(new Date(date), 'MMM dd, yyyy hh:mm a');
  };

  const columns: Column<Exam>[] = [
    {
      key: 'exam',
      label: 'Exam',
      width: 'w-2/5',
      render: (exam) => (
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {exam.title}
            </p>
            <p className="text-sm text-gray-500 truncate" title={exam.description ? getPlainTextPreview(exam.description) : 'No description'}>
              {exam.description ? getPlainTextPreview(exam.description, 40) : 'No description'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {getTypeBadge(exam)}
              {exam.course != null ? (
                <Badge variant="outline" className="text-xs">
                  {(exam.course as { title?: string })?.title || "Course"}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'details',
      label: 'Details',
      width: 'w-1/4',
      render: (exam) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(exam.duration)}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Target className="w-3 h-3" />
            <span>{exam.totalMarks} marks</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Award className="w-3 h-3" />
            <span>Pass: {exam.passingMarks}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users className="w-3 h-3" />
            <span>{exam.questionCount || 0} questions</span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (exam) => (
        <div className="space-y-2">
          {getStatusBadge(exam)}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {exam.isActive ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-red-500" />
            )}
            <span>{exam.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'schedule',
      label: 'Schedule',
      width: 'w-1/4',
      render: (exam) => (
        <div className="space-y-1">
          {exam.startDate && (
            <div className="text-sm text-gray-900">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                Start
              </div>
              {formatDateTime(exam.startDate)}
            </div>
          )}
          {exam.endDate && (
            <div className="text-sm text-gray-900">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                End
              </div>
              {formatDateTime(exam.endDate)}
            </div>
          )}
          {!exam.startDate && !exam.endDate && (
            <div className="text-sm text-gray-500 italic">
              No time limits
            </div>
          )}
        </div>
      )
    },
    {
      key: 'created',
      label: 'Created',
      width: 'w-1/6',
      render: (exam) => (
        <div className="text-sm text-gray-900">
          {formatDate(exam.createdAt)}
        </div>
      )
    }
  ];

  const actions: Action<Exam>[] = [
    ...(onViewAttempts
      ? [
          {
            key: 'attempts',
            label: 'View Attempts',
            icon: <Eye className="w-4 h-4" />,
            onClick: onViewAttempts,
            variant: 'default' as const,
          },
        ]
      : []),
    ...(onView
      ? [
          {
            key: 'view',
            label: 'View Details',
            icon: <Eye className="w-4 h-4" />,
            onClick: onView,
            variant: 'secondary' as const,
          },
        ]
      : []),
    ...(onManageQuestions ? [{
      key: 'questions',
      label: 'Manage Questions',
      icon: <BookOpen className="w-4 h-4" />,
      onClick: onManageQuestions,
      variant: 'default' as const
    }] : []),
    {
      key: 'edit',
      label: 'Edit Exam',
      icon: <Edit className="w-4 h-4" />,
      onClick: onEdit,
      variant: 'secondary' as const
    },
    {
      key: 'delete',
      label: 'Delete Exam',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'destructive' as const
    }
  ];

  const emptyState = {
    title: 'No exams found',
    description: 'Get started by creating a new exam.',
    icon: (
      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  };

  return (
    <DataTable
      data={exams}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={emptyState}
      pagination={{
        ...pagination,
        onPageChange
      }}
      variant={variant}
      getItemId={(exam) => exam._id}
    />
  );
}
