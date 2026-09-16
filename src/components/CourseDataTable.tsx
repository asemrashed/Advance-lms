'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Course } from '@/types/course';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { formatBdt } from '@/lib/currency';
import { resolveImageSrc } from '@/lib/resolveImageSrc';
import {
  LuPencil as Edit,
  LuTrash2 as Trash2,
  LuEye as Eye,
  LuEyeOff as EyeOff,
  LuTag as Tag,
  LuBookOpen as BookOpen,
  LuGripVertical as GripVertical,
} from 'react-icons/lu';
import { format } from 'date-fns';
import { formatGradeLabel } from '@/lib/courseLabel';

interface CourseDataTableProps {
  courses: Course[];
  loading: boolean;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  onView?: (course: Course) => void;
  onBuild?: (course: Course) => void;
  onToggleVisibility?: (course: Course) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
  reorderEnabled?: boolean;
  onReorder?: (courses: Course[]) => void;
}

export default function CourseDataTable({
  courses,
  loading,
  onEdit,
  onDelete,
  onView,
  onBuild,
  onToggleVisibility,
  pagination,
  onPageChange,
  variant = 'table',
  reorderEnabled = false,
  onReorder
}: CourseDataTableProps) {
  const [orderedCourses, setOrderedCourses] = useState<Course[]>(courses);

  useEffect(() => {
    setOrderedCourses(courses);
  }, [courses]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tableCourses = reorderEnabled ? orderedCourses : courses;

  const getPriceBadge = (course: Course) => {
    if (!course.isPaid) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Free
        </Badge>
      );
    }

    if (course.salePrice && course.salePrice < course.price!) {
      return (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Badge variant="destructive" className="w-fit bg-red-100 text-red-800">
            {formatBdt(course.salePrice!)}
          </Badge>
          <span className="text-[10px] text-gray-500 line-through">
            {formatBdt(course.price!)}
          </span>
        </div>
      );
    }

    return (
      <Badge
        variant="default"
        className="text-white"
        style={{
          background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)',
        }}
      >
        {formatBdt(course.price!)}
      </Badge>
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

  const columns: Column<Course>[] = [
    {
      key: 'course',
      label: 'Course',
      className: 'max-w-0',
      render: (course) => (
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative shrink-0">
            {course.thumbnailUrl ? (
              <div className="h-9 w-9 overflow-hidden rounded-md shadow-sm">
                <img
                  src={resolveImageSrc(course.thumbnailUrl)}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md text-white shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)',
                }}
              >
                <Tag className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900" title={course.title}>
              {course.title}
            </p>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1">
              {course.categoryInfo?.name ||
              (typeof course.category === 'string' ? course.category : null) ? (
                <Badge variant="outline" className="max-w-[7rem] truncate text-[10px] px-1.5 py-0">
                  {course.categoryInfo?.name ||
                    (typeof course.category === 'string' ? course.category : 'N/A')}
                </Badge>
              ) : null}
              {(course.courseType || 'recorded') === 'live' ? (
                <Badge className="bg-violet-100 px-1.5 py-0 text-[10px] text-violet-800">
                  Live
                </Badge>
              ) : (
                <Badge className="bg-sky-100 px-1.5 py-0 text-[10px] text-sky-800">
                  Recorded
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'grade',
      label: 'Class',
      render: (course) => (
        <span className="text-xs text-gray-700">
          {course.grade ? formatGradeLabel(course.grade) : '—'}
        </span>
      ),
    },
    {
      key: 'pricing',
      label: 'Price',
      render: (course) => (
        <div className="min-w-0">{getPriceBadge(course)}</div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (course) => (
        <div className="flex flex-col gap-0.5">
          <Badge
            variant={
              course.status === 'published'
                ? 'default'
                : course.status === 'draft'
                  ? 'secondary'
                  : 'outline'
            }
            className={
              course.status === 'published'
                ? 'w-fit bg-green-100 text-green-800'
                : course.status === 'draft'
                  ? 'w-fit bg-yellow-100 text-yellow-800'
                  : course.status === 'pending_approval'
                    ? 'w-fit bg-amber-100 text-amber-800'
                    : 'w-fit bg-gray-100 text-gray-800'
            }
          >
            {course.status === 'published'
              ? 'Published'
              : course.status === 'draft'
                ? 'Draft'
                : course.status === 'pending_approval'
                  ? 'Pending'
                  : course.status === 'archived'
                    ? 'Archived'
                    : 'Unknown'}
          </Badge>
          {course.isHidden ? (
            <Badge variant="outline" className="w-fit bg-red-50 text-[10px] text-red-700 border-red-300">
              Hidden
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'creator',
      label: 'Creator',
      className: 'max-w-0',
      render: (course) => {
        const name = course.createdBy?.name || 'Unknown';
        return (
          <p className="truncate text-xs font-medium text-gray-900" title={name}>
            {name}
          </p>
        );
      },
    },
    {
      key: 'instructor',
      label: 'Instructor',
      className: 'max-w-0',
      render: (course) => {
        const person =
          course.instructorInfo ||
          (typeof course.instructor === 'object' && course.instructor
            ? course.instructor
            : null);
        const name = person?.name || (typeof course.instructor === 'string' ? 'Assigned' : '');
        const display = name || '—';
        return (
          <p className="truncate text-xs font-medium text-gray-900" title={display}>
            {display}
          </p>
        );
      },
    },
    {
      key: 'created',
      label: 'Created',
      render: (course) => (
        <span className="whitespace-nowrap text-xs text-gray-700">
          {formatDate(course.createdAt)}
        </span>
      ),
    },
  ];

  const actions: Action<Course>[] = [
    ...(onView ? [{
      key: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: onView,
      variant: 'secondary' as const
    }] : []),
    ...(onBuild ? [{
      key: 'build',
      label: 'Build',
      icon: <BookOpen className="w-4 h-4" />,
      onClick: onBuild,
      variant: 'default' as const
    }] : []),
    ...(onToggleVisibility ? [{
      key: 'toggle-visibility',
      label: (course: Course) => (course.isHidden ? 'Unhide' : 'Hide'),
      icon: (course: Course) =>
        course.isHidden
          ? <EyeOff className="w-4 h-4" />
          : <Eye className="w-4 h-4" />,
      className: (course: Course) =>
        course.isHidden
          ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
          : 'text-gray-700',
      onClick: onToggleVisibility,
      variant: 'secondary' as const
    }] : []),
    {
      key: 'edit',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: onEdit,
      variant: 'secondary' as const
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'destructive' as const
    }
  ];

  const emptyState = {
    title: 'No courses found',
    description: 'Get started by adding a new course to the system.',
    icon: (
      <svg className="w-10 h-10" style={{ color: '#A855F7' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCourses.findIndex((c) => c._id === active.id);
    const newIndex = orderedCourses.findIndex((c) => c._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const updated = arrayMove(orderedCourses, oldIndex, newIndex);
    setOrderedCourses(updated);
    onReorder?.(updated);
  };

  const getActionLabel = (action: Action<Course>, course: Course) =>
    typeof action.label === 'function' ? action.label(course) : action.label;

  const getActionIcon = (action: Action<Course>, course: Course) =>
    typeof action.icon === 'function' ? action.icon(course) : action.icon;

  const getActionClassName = (action: Action<Course>, course: Course) =>
    typeof action.className === 'function'
      ? action.className(course)
      : action.className || '';

  const renderStatusBadge = (course: Course) => (
    <Badge
      variant={
        course.status === 'published'
          ? 'default'
          : course.status === 'draft'
            ? 'secondary'
            : 'outline'
      }
      className={
        course.status === 'published'
          ? 'w-fit bg-green-100 text-green-800'
          : course.status === 'draft'
            ? 'w-fit bg-yellow-100 text-yellow-800'
            : course.status === 'pending_approval'
              ? 'w-fit bg-amber-100 text-amber-800'
              : 'w-fit bg-gray-100 text-gray-800'
      }
    >
      {course.status === 'published'
        ? 'Published'
        : course.status === 'draft'
          ? 'Draft'
          : course.status === 'pending_approval'
            ? 'Pending'
            : course.status === 'archived'
              ? 'Archived'
              : 'Unknown'}
    </Badge>
  );

  const renderCompactMobileList = (
    items: Course[],
    withDrag = false,
  ) => (
    <div className="space-y-3">
      {items.map((course) => {
        const creator = course.createdBy?.name || 'Unknown';
        const courseType = course.courseType || 'recorded';
        const card = (
          <Card key={course._id} className="overflow-hidden border-gray-200 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-start gap-3 p-4">
                {course.thumbnailUrl ? (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={resolveImageSrc(course.thumbnailUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{
                      background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)',
                    }}
                  >
                    <BookOpen className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    {renderStatusBadge(course)}
                    {courseType === 'live' ? (
                      <Badge className="bg-violet-100 text-violet-800">Live</Badge>
                    ) : (
                      <Badge className="bg-sky-100 text-sky-800">Recorded</Badge>
                    )}
                    {course.isHidden ? (
                      <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                        Hidden
                      </Badge>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                    {course.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {course.grade ? formatGradeLabel(course.grade) : 'All grades'}
                    {' · '}
                    {course.isPaid
                      ? formatBdt(course.finalPrice ?? course.price ?? 0)
                      : 'Free'}
                    {' · '}
                    {creator}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50/80 px-4 py-3">
                {actions.map((action) => (
                  <Button
                    key={action.key}
                    variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                    size="sm"
                    className={`h-8 gap-1.5 px-2.5 text-xs ${getActionClassName(action, course)}`}
                    onClick={() => action.onClick(course)}
                  >
                    {getActionIcon(action, course)}
                    {getActionLabel(action, course)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        );

        if (!withDrag) return card;

        return (
          <SortableCourseMobileCard key={course._id} course={course}>
            {card}
          </SortableCourseMobileCard>
        );
      })}
    </div>
  );

  const renderReorderTable = () => {
    const allColumns = [
      { key: '__drag', label: '', width: 'w-8' },
      ...columns,
      { key: '__actions', label: 'Actions', width: 'w-[7.5rem]' },
    ];

    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-8" />
              <col className="w-[28%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
              <tr>
                {allColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 ${
                      column.key === '__actions' ? 'text-center' : ''
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <SortableContext items={orderedCourses.map((c) => c._id)} strategy={verticalListSortingStrategy}>
              <tbody className="divide-y divide-gray-200">
                {orderedCourses.map((course, index) => (
                  <SortableCourseRow
                    key={course._id}
                    course={course}
                    index={index}
                    columns={columns}
                    actions={actions}
                    onAction={(action, item) => action.onClick(item)}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </div>
      </DndContext>
    );
  };

  const renderSimplePagination = () =>
    pagination.pages > 1 ? (
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (tableCourses.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex justify-center">{emptyState.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900">{emptyState.title}</h3>
        <p className="mt-2 text-sm text-gray-500">{emptyState.description}</p>
      </div>
    );
  }

  return (
    reorderEnabled && variant === 'table'
      ? (
        <div className="space-y-4">
          <div className="md:hidden">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={orderedCourses.map((c) => c._id)}
                strategy={verticalListSortingStrategy}
              >
                {renderCompactMobileList(orderedCourses, true)}
              </SortableContext>
            </DndContext>
          </div>
          <div className="hidden md:block">{renderReorderTable()}</div>
          {renderSimplePagination()}
        </div>
      )
      : variant === 'table' ? (
        <div className="space-y-4">
          <div className="md:hidden">
            {renderCompactMobileList(tableCourses)}
            {renderSimplePagination()}
          </div>
          <div className="hidden md:block">
            <DataTable
              data={tableCourses}
              columns={columns}
              actions={actions}
              actionDisplay="buttons"
              fitViewport
              loading={false}
              emptyState={emptyState}
              pagination={{
                ...pagination,
                onPageChange,
              }}
              variant="table"
              getItemId={(course) => course._id}
              className="[&>div:first-child]:hidden"
            />
          </div>
        </div>
      ) : (
        <DataTable
          data={tableCourses}
          columns={columns}
          actions={actions}
          actionDisplay="buttons"
          fitViewport
          loading={loading}
          emptyState={emptyState}
          pagination={{
            ...pagination,
            onPageChange
          }}
          variant={variant}
          getItemId={(course) => course._id}
        />
      )
  );
}

function SortableCourseMobileCard({
  course,
  children,
}: {
  course: Course;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: course._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? 'opacity-80' : undefined}
    >
      <div className="mb-2 flex items-center gap-2 px-1 text-xs text-gray-500">
        <button
          type="button"
          className="cursor-grab rounded-md border border-gray-200 bg-white p-1.5 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${course.title}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="line-clamp-1 font-medium text-gray-700">{course.title}</span>
      </div>
      {children}
    </div>
  );
}

function SortableCourseRow({
  course,
  index,
  columns,
  actions,
  onAction,
}: {
  course: Course;
  index: number;
  columns: Column<Course>[];
  actions: Action<Course>[];
  onAction: (action: Action<Course>, item: Course) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: course._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getActionLabel = (action: Action<Course>) =>
    typeof action.label === 'function' ? action.label(course) : action.label;

  const getActionIcon = (action: Action<Course>) =>
    typeof action.icon === 'function' ? action.icon(course) : action.icon;

  const getActionClassName = (action: Action<Course>) =>
    typeof action.className === 'function' ? action.className(course) : (action.className || '');

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group transition-colors duration-200 hover:bg-gray-50 ${isDragging ? 'bg-purple-50' : ''}`}
    >
      <td className="px-1.5 py-2.5 text-gray-900">
        <button
          type="button"
          className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${course.title}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      {columns.map((column) => (
        <td
          key={column.key}
          className={`px-2 py-2.5 text-xs text-gray-900 ${column.className || ''}`}
        >
          {column.render ? column.render(course, index) : (course as any)[column.key]}
        </td>
      ))}
      <td className="px-1.5 py-2.5 text-sm text-gray-900">
        <div className="flex flex-wrap items-center justify-center gap-0.5">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
              size="icon"
              className={`h-7 w-7 ${
                action.variant === 'destructive'
                  ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                  : ''
              } ${getActionClassName(action)}`}
              onClick={() => onAction(action, course)}
              title={getActionLabel(action)}
            >
              {getActionIcon(action)}
            </Button>
          ))}
        </div>
      </td>
    </tr>
  );
}
