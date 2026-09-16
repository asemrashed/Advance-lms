'use client';

import { Teacher, TeacherAccountStatus } from '@/types/teacher';
import { Badge } from '@/components/ui/badge';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { LuPencil as Edit, LuTrash2 as Trash2, LuEye as Eye } from 'react-icons/lu';;
import { getInitials } from '@/lib/formatters';
import { format } from 'date-fns';

interface TeacherDataTableProps {
  teachers: Teacher[];
  loading: boolean;
  onEdit?: (teacher: Teacher) => void;
  onDelete?: (teacher: Teacher) => void;
  onView?: (teacher: Teacher) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
}

export default function TeacherDataTable({
  teachers,
  loading,
  onEdit,
  onDelete,
  onView,
  pagination,
  onPageChange,
  variant = 'table'
}: TeacherDataTableProps) {
  const getStatusBadge = (accountStatus: TeacherAccountStatus) => {
    switch (accountStatus) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const columns: Column<Teacher>[] = [
    {
      key: 'teacher',
      label: 'Teacher',
      width: 'w-1/4',
      render: (teacher) => (
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            {teacher.avatar ? (
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg">
                <img
                  src={teacher.avatar}
                  alt={teacher.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {getInitials(teacher.name)}
              </div>
            )}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
              teacher.accountStatus === 'active' ? 'bg-green-500' : teacher.accountStatus === 'pending' ? 'bg-amber-400' : 'bg-red-500'
            }`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {teacher.name}
              </h3>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {teacher.email}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      width: 'w-1/4',
      render: (teacher) => (
        <div className="text-sm text-gray-600">
          {teacher.phone || 'N/A'}
        </div>
      )
    },
    {
      key: 'address',
      label: 'Address',
      width: 'w-1/4',
      render: (teacher) => (
        <div className="space-y-1">
          {teacher.address?.fullAddress ? (
            <p className="text-sm text-gray-900 truncate">
              {teacher.address.fullAddress}
            </p>
          ) : (
            <p className="text-xs text-gray-500">No address</p>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (teacher) => (
        <div>
          {getStatusBadge(teacher.accountStatus)}
        </div>
      )
    }
  ];

  const actions: Action<Teacher>[] = [
    ...(onView ? [{
      key: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: onView,
      variant: 'default' as const
    }] : []),
    ...(onEdit ? [{
      key: 'edit',
      label: 'Edit Teacher',
      icon: <Edit className="w-4 h-4" />,
      onClick: onEdit,
      variant: 'default' as const
    }] : []),
    ...(onDelete ? [{
      key: 'delete',
      label: 'Delete Teacher',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'destructive' as const
    }] : []),
  ];

  const emptyState = {
    title: 'No teachers found',
    description: 'Get started by adding a new teacher to the system.',
    icon: (
      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    )
  };

  return (
    <DataTable
      data={teachers}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={emptyState}
      pagination={{
        ...pagination,
        onPageChange
      }}
      variant={variant}
      getItemId={(teacher) => teacher._id}
    />
  );
}
