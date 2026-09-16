'use client';

import { Assignment } from '@/types/assignment';
import { Badge } from '@/components/ui/badge';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { LuPencil as Edit, LuTrash2 as Trash2, LuEye as Eye, LuFileText as LuFileText, LuUpload as Upload, LuCircle as HelpCircle, LuFolderOpen as FolderOpen, LuPresentation as Presentation, LuCalendar as Calendar, LuClock as Clock, LuTarget as Target, LuUsers as Users, LuCheck as CheckCircle, LuX as XCircle, LuAward as Award, LuSend as Send } from 'react-icons/lu';;
import { format } from 'date-fns';
import { getPlainTextPreview } from '@/lib/utils';

interface AssignmentDataTableProps {
  assignments: Assignment[];
  loading: boolean;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: (assignment: Assignment) => void;
  onViewSubmissions?: (assignment: Assignment) => void;
  onSubmit?: (assignment: Assignment) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
}

export default function AssignmentDataTable({
  assignments,
  loading,
  onEdit,
  onDelete,
  onViewSubmissions,
  onSubmit,
  pagination,
  onPageChange,
  variant = 'table'
}: AssignmentDataTableProps) {
  const getStatusBadge = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
    const startDate = assignment.startDate ? new Date(assignment.startDate) : null;

    if (!assignment.isPublished) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <LuFileText className="w-3 h-3 mr-1" />
          Draft
        </Badge>
      );
    }

    if (!assignment.isActive) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Inactive
        </Badge>
      );
    }

    if (startDate && now < startDate) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
          <Calendar className="w-3 h-3 mr-1" />
          Scheduled
        </Badge>
      );
    }

    if (dueDate && now > dueDate) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }

    if (assignment.isPublished && assignment.isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">
        Unknown
      </Badge>
    );
  };

  const getTypeBadge = (assignment: Assignment) => {
    const colors: Record<string, string> = {
      pdf: 'bg-red-100 text-red-800',
      mcq: 'bg-indigo-100 text-indigo-800',
      essay: 'bg-blue-100 text-blue-800',
      file_upload: 'bg-green-100 text-green-800',
      quiz: 'bg-purple-100 text-purple-800',
      project: 'bg-orange-100 text-orange-800',
      presentation: 'bg-pink-100 text-pink-800'
    };

    return (
      <Badge variant="outline" className={colors[assignment.type] || 'bg-gray-100 text-gray-800'}>
        {assignment.type.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <Upload className="w-4 h-4" />;
      case 'mcq':
        return <HelpCircle className="w-4 h-4" />;
      case 'essay':
        return <LuFileText className="w-4 h-4" />;
      case 'file_upload':
        return <Upload className="w-4 h-4" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4" />;
      case 'project':
        return <FolderOpen className="w-4 h-4" />;
      case 'presentation':
        return <Presentation className="w-4 h-4" />;
      default:
        return <LuFileText className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatDateTime = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy hh:mm a');
  };

  const columns: Column<Assignment>[] = [
    {
      key: 'assignment',
      label: 'Assignment',
      width: 'w-2/5',
      render: (assignment) => (
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {getTypeIcon(assignment.type)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {assignment.title}
            </p>
            <p className="text-sm text-gray-500 truncate" title={assignment.description ? getPlainTextPreview(assignment.description) : 'No description'}>
              {assignment.description ? getPlainTextPreview(assignment.description, 40) : 'No description'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {getTypeBadge(assignment)}
              {assignment.course && (
                <Badge variant="outline" className="text-xs">
                  {(assignment.course as any)?.title || 'Course'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'details',
      label: 'Details',
      width: 'w-1/4',
      render: (assignment) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Target className="w-3 h-3" />
            <span>{assignment.totalMarks} marks</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Award className="w-3 h-3" />
            <span>Pass: {assignment.passingMarks}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users className="w-3 h-3" />
            <span>{assignment.maxAttempts} attempts</span>
          </div>
          {assignment.allowLateSubmission && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-3 h-3" />
              <span>Late allowed</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (assignment) => (
        <div className="space-y-2">
          {getStatusBadge(assignment)}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {assignment.isActive ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-red-500" />
            )}
            <span>{assignment.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'schedule',
      label: 'Schedule',
      width: 'w-1/4',
      render: (assignment) => (
        <div className="space-y-1">
          {assignment.startDate && (
            <div className="text-sm text-gray-900">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                Start
              </div>
              {formatDateTime(assignment.startDate)}
            </div>
          )}
          {assignment.dueDate && (
            <div className="text-sm text-gray-900">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                Due
              </div>
              {formatDateTime(assignment.dueDate)}
            </div>
          )}
          {!assignment.startDate && !assignment.dueDate && (
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
      render: (assignment) => (
        <div className="text-sm text-gray-900">
          {formatDate(assignment.createdAt)}
        </div>
      )
    }
  ];

  const actions: Action<Assignment>[] = [
    ...(onSubmit ? [{
      key: 'submit',
      label: 'Submit',
      icon: <Send className="w-4 h-4" />,
      onClick: onSubmit,
      variant: 'default' as const
    }] : []),
    ...(onViewSubmissions ? [{
      key: 'submissions',
      label: 'View Submissions',
      icon: <Eye className="w-4 h-4" />,
      onClick: onViewSubmissions,
      variant: 'default' as const
    }] : []),
    ...(onEdit ? [{
      key: 'edit',
      label: 'Edit Assignment',
      icon: <Edit className="w-4 h-4" />,
      onClick: onEdit,
      variant: 'secondary' as const
    }] : []),
    ...(onDelete ? [{
      key: 'delete',
      label: 'Delete Assignment',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'destructive' as const
    }] : [])
  ];

  const emptyState = {
    title: 'No assignments found',
    description: 'Get started by creating a new assignment.',
    icon: (
      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  };

  return (
    <DataTable
      data={assignments}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={emptyState}
      pagination={{
        ...pagination,
        onPageChange
      }}
      variant={variant}
      getItemId={(assignment) => assignment._id}
    />
  );
}
