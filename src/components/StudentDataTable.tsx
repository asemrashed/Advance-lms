'use client';

import { Student } from '@/types/student';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { LuPencil as Edit, LuTrash2 as Trash2, LuEye as Eye } from 'react-icons/lu';;
import { getInitials } from '@/lib/formatters';
import { format, formatDistanceToNow } from 'date-fns';

interface StudentDataTableProps {
  students: Student[];
  loading: boolean;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
  onView?: (student: Student) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
}

export default function StudentDataTable({
  students,
  loading,
  onEdit,
  onDelete,
  onView,
  pagination,
  onPageChange,
  variant = 'table'
}: StudentDataTableProps) {
  const formatDateTime = (date?: Date | string) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return 'N/A';
    return format(parsedDate, 'MMM dd, yyyy hh:mm a');
  };

  const formatTimeAgo = (date?: Date | string) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return 'N/A';
    return formatDistanceToNow(parsedDate, { addSuffix: true });
  };

  const columns: Column<Student>[] = [
    {
      key: 'student',
      label: 'Student',
      width: 'w-1/4',
      render: (student) => (
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            {student.avatar ? (
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg">
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {getInitials(student.name)}
              </div>
            )}
            {/* <div className="absolute -bottom-1 -right-1">
              {getStatusBadge(student.isActive)}
            </div> */}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {student.name}
            </p>
            <p className="text-sm text-gray-500 truncate">{student.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      width: 'w-1/4',
      render: (student) => (
        <div className="space-y-1">
          <p className="text-sm text-gray-900">
            {student.phone || 'N/A'}
          </p>
          {student.parentPhone && (
            <p className="text-xs text-gray-500 truncate">
              Parent: {student.parentPhone}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'address',
      label: 'Address',
      width: 'w-1/5',
      render: (student) => (
        <div className="space-y-1">
          {student.address?.fullAddress ? (
            <p className="text-sm text-gray-900 truncate">
              {student.address.fullAddress}
            </p>
          ) : (
            <p className="text-xs text-gray-500">No address</p>
          )}
        </div>
      )
    },
    {
      key: 'enrollment',
      label: 'Enrolled At',
      width: 'w-1/5',
      render: (student) => (
        <div className="space-y-1">
          <p className="text-sm text-gray-900">
            {formatDateTime(student.enrollmentDate || student.createdAt)}
          </p>
          <p className="text-xs text-gray-500">
            {formatTimeAgo(student.enrollmentDate || student.createdAt)}
          </p>
        </div>
      )
    },
    {
      key: 'totalEnrolled',
      label: 'Total Enrolled',
      width: 'w-1/5',
      render: (student) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-900">
            ${student.totalEnrolledAmount?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-500">
            {student.enrollmentCount || 0} course{student.enrollmentCount !== 1 ? 's' : ''}
          </p>
        </div>
      )
    }
  ];

  const actions: Action<Student>[] = [
    ...(onView ? [{
      key: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: onView,
      variant: 'secondary' as const
    }] : []),
    ...(onEdit ? [{
      key: 'edit',
      label: 'Edit Student',
      icon: <Edit className="w-4 h-4" />,
      onClick: onEdit,
      variant: 'secondary' as const
    }] : []),
    ...(onDelete ? [{
      key: 'delete',
      label: 'Delete Student',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'destructive' as const
    }] : []),
  ];

  return (
    <DataTable
      data={students}
      columns={columns}
      actions={actions}
      loading={loading}
      pagination={{
        ...pagination,
        onPageChange
      }}
      variant={variant}
      emptyState={{
        title: "No students found",
        description: "Add your first student to get started. Students will appear here once they are added to the system."
      }}
    />
  );
}
