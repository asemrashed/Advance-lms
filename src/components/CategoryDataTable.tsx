'use client';

import { CourseCategory } from '@/types/course-category';
import { Badge } from '@/components/ui/badge';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { LuPencil as Edit, LuTrash2 as Trash2, LuEye as Eye, LuTag as Tag, LuPalette as Palette, LuBookOpen as BookOpen } from 'react-icons/lu';;
import { format } from 'date-fns';
import { getPlainTextPreview } from '@/lib/utils';

interface CategoryDataTableProps {
  categories: CourseCategory[];
  loading: boolean;
  onEdit: (category: CourseCategory) => void;
  onDelete: (category: CourseCategory) => void;
  onView?: (category: CourseCategory) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
}

export default function CategoryDataTable({
  categories,
  loading,
  onEdit,
  onDelete,
  onView,
  pagination,
  onPageChange,
  variant = 'table'
}: CategoryDataTableProps) {
  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const getColorBadge = (color?: string) => {
    if (!color) return null;
    
    return (
      <div className="flex items-center gap-2">
        <div 
          className="w-4 h-4 rounded-full border border-gray-300"
          style={{ backgroundColor: color }}
        ></div>
        <span className="text-xs text-gray-600 font-mono">{color}</span>
      </div>
    );
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (date == null || date === '') return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return 'Invalid date';
    try {
      return format(d, 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const columns: Column<CourseCategory>[] = [
    {
      key: 'category',
      label: 'Category',
      width: 'w-2/5',
      render: (category) => (
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md"
              style={{ backgroundColor: category.color || '#3B82F6' }}
            >
              {category.icon ? (
                <span className="text-lg">{category.icon}</span>
              ) : (
                <Tag className="w-6 h-6" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {category.name}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {category.description ? getPlainTextPreview(category.description, 60) : 'No description'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(category.isActive)}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'appearance',
      label: 'Appearance',
      width: 'w-1/4',
      render: (category) => (
        <div className="space-y-2">
          {getColorBadge(category.color)}
          {category.icon && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>Icon:</span>
              <span className="font-mono">{category.icon}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'courses',
      label: 'Courses',
      width: 'w-1/6',
      render: (category) => (
        <div className="flex items-center gap-1">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">
            {category.courseCount || 0}
          </span>
        </div>
      )
    },
    {
      key: 'created',
      label: 'Created',
      width: 'w-1/4',
      render: (category) => (
        <div className="text-sm text-gray-900">
          {formatDate(category.createdAt)}
        </div>
      )
    }
  ];

  const actions: Action<CourseCategory>[] = [
    ...(onView ? [{
      key: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: onView,
      variant: 'secondary' as const
    }] : []),
    {
      key: 'edit',
      label: 'Edit Category',
      icon: <Edit className="w-4 h-4" />,
      onClick: onEdit,
      variant: 'secondary' as const
    },
    {
      key: 'delete',
      label: 'Delete Category',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'destructive' as const
    }
  ];

  const emptyState = {
    title: 'No categories found',
    description: 'Get started by adding a new category to organize your courses.',
    icon: (
      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    )
  };

  return (
    <DataTable
      data={categories}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={emptyState}
      pagination={{
        ...pagination,
        onPageChange
      }}
      variant={variant}
      getItemId={(category) => category._id}
    />
  );
}
