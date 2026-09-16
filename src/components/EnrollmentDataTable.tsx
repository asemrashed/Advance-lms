import React from 'react';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Enrollment } from '@/types/enrollment';
import { LuPencil as Edit, LuTrash2 as Trash2, LuEye as Eye, LuUser as User, LuBookOpen as BookOpen, LuCalendar as Calendar, LuTrendingUp as TrendingUp } from 'react-icons/lu';;
import { formatCurrency, formatDateTime, formatTimeAgo, getInitials } from '@/lib/formatters';

interface EnrollmentDataTableProps {
  enrollments: Enrollment[];
  loading: boolean;
  onEdit?: (enrollment: Enrollment) => void;
  onDelete?: (enrollment: Enrollment) => void;
  onView?: (enrollment: Enrollment) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
  extraActions?: Action<Enrollment>[];
  showAccess?: boolean;
}

const EnrollmentDataTable: React.FC<EnrollmentDataTableProps> = ({
  enrollments,
  loading,
  onEdit,
  onDelete,
  onView,
  pagination,
  onPageChange,
  variant = 'table',
  extraActions = [],
  showAccess = false,
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed' },
      dropped: { color: 'bg-red-100 text-red-800', label: 'Dropped' },
      suspended: { color: 'bg-yellow-100 text-yellow-800', label: 'Suspended' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const paymentConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' }
    };
    
    const config = paymentConfig[paymentStatus as keyof typeof paymentConfig] || paymentConfig.pending;
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const columns: Column<Enrollment>[] = [
    {
      key: 'student',
      label: 'Student',
      width: 'w-1/4',
      mobileFullWidth: true,
      render: (enrollment) => (
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            {enrollment.studentInfo?.avatar ? (
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg">
                <img
                  src={enrollment.studentInfo.avatar}
                  alt={enrollment.studentInfo.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {enrollment.studentInfo ? getInitials(enrollment.studentInfo.name) : '??'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {enrollment.studentInfo ? enrollment.studentInfo.name : 'Unknown Student'}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {enrollment.studentInfo?.email || 'No email'}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'course',
      label: 'Course',
      width: 'w-1/4',
      mobileFullWidth: true,
      render: (enrollment) => {
        const course = enrollment.courseInfo || enrollment.courseLuInfo;
        return (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {course?.title || 'Unknown Course'}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {course?.category || 'No category'}
            </p>
          </div>
        </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-20',
      render: (enrollment) => getStatusBadge(enrollment.status)
    },
    {
      key: 'progress',
      label: 'Progress',
      width: 'w-24',
      render: (enrollment) => (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${enrollment.progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-600 min-w-0">
            {enrollment.progress}%
          </span>
        </div>
      )
    },
    {
      key: 'payment',
      label: 'Payment',
      width: 'w-24',
      render: (enrollment) => (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900">
            {enrollment.paymentAmount ? formatCurrency(enrollment.paymentAmount) : 'Free'}
          </div>
          {getPaymentStatusBadge(enrollment.paymentStatus)}
          {enrollment.paymentMethod ? (
            <div className="text-[11px] text-gray-500">
              {enrollment.paymentMethod === "cash" ? "Offline" : "Online"}
            </div>
          ) : null}
          {enrollment.paymentDueAt &&
          enrollment.paymentStatus !== "paid" &&
          new Date(enrollment.paymentDueAt) > new Date() ? (
            <div className="text-[11px] text-amber-600">
              Pay by {new Date(enrollment.paymentDueAt).toLocaleDateString()}
            </div>
          ) : null}
        </div>
      )
    },
    ...(showAccess ? [{
      key: 'access',
      label: 'Access',
      width: 'w-24',
      render: (enrollment: Enrollment) => (
        <div className="space-y-1">
          <Badge className={enrollment.accessBlocked ? 'border-0 bg-red-100 text-red-800' : 'border-0 bg-green-100 text-green-800'}>
            {enrollment.accessBlocked ? 'Blocked' : 'Active'}
          </Badge>
          {enrollment.paymentDueAt && new Date(enrollment.paymentDueAt) > new Date() ? (
            <div className="text-[11px] text-amber-600">
              {enrollment.paymentStatus !== 'paid' ? 'Pay by' : 'Grace till'}{' '}
              {new Date(enrollment.paymentDueAt).toLocaleDateString()}
            </div>
          ) : null}
        </div>
      )
    }] : []),
    {
      key: 'enrolledAt',
      label: 'Enrolled At',
      width: 'w-24',
      render: (enrollment) => (
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            {formatDateTime(enrollment.enrolledAt)}
          </p>
          <p className="text-xs text-gray-500">
            {formatTimeAgo(enrollment.enrolledAt)}
          </p>
        </div>
      )
    }
  ];

  const actions: Action<Enrollment>[] = [
    ...extraActions,
    ...(onView ? [{
      key: 'view',
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      onClick: onView,
      variant: 'secondary' as const
    }] : []),
    ...(onEdit ? [{
      key: 'edit',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: onEdit,
      variant: 'secondary' as const
    }] : []),
    ...(onDelete ? [{
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'destructive' as const
    }] : []),
  ];

  const emptyState = {
    title: "No enrollments found",
    description: "There are no enrollments to display at the moment.",
    icon: <User className="w-12 h-12 text-gray-400" />
  };

  return (
    <DataTable
      data={enrollments}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={emptyState}
      pagination={{
        ...pagination,
        onPageChange
      }}
      variant={variant}
      getItemId={(enrollment) => enrollment._id}
    />
  );
};

export default EnrollmentDataTable;
