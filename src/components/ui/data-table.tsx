'use client';

import { ReactNode, useState } from 'react';
import { StaffMobileRecordCard, StaffRecordField, StaffRecordFields } from '@/components/staff/StaffResponsive';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LuEllipsis, LuChevronLeft as ChevronLeft, LuChevronRight as ChevronRight, LuChevronsLeft, LuChevronsRight, LuX as X } from 'react-icons/lu';;
import { htmlToPlainText } from '@/lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
  /** Stretch this field across both columns on mobile record cards. */
  mobileFullWidth?: boolean;
}

export interface Action<T> {
  key: string;
  label: string | ((item: T) => string);
  icon?: ReactNode | ((item: T) => ReactNode);
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive' | 'secondary';
  className?: string | ((item: T) => string);
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  loading?: boolean;
  emptyState?: {
    title: string;
    description: string;
    icon?: ReactNode;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    onPageChange: (page: number) => void;
  };
  variant?: 'table' | 'cards' | 'list';
  className?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  getItemId?: (item: T) => string;
  actionDisplay?: 'dropdown' | 'buttons';
  /** Fit table to container without horizontal scroll */
  fitViewport?: boolean;
}

export default function DataTable<T>({
  data,
  columns,
  actions = [],
  loading = false,
  emptyState,
  pagination,
  variant = 'cards',
  className = '',
  rowClassName = '',
  onRowClick,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  getItemId = (item: any) => {
    const id = item?.id ?? item?._id;
    return id != null && String(id) !== '' ? String(id) : '';
  },
  actionDisplay = 'dropdown',
  fitViewport = false,
}: DataTableProps<T>) {
  const safeData = Array.isArray(data) ? data : [];
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const actionColumnWidthClass = actionDisplay === 'buttons'
    ? (fitViewport ? 'w-[7.5rem]' : 'w-[360px]')
    : 'w-20';

  const handleActionClick = (action: Action<T>, item: T) => {
    action.onClick(item);
  };

  const getActionLabel = (action: Action<T>, item: T) =>
    typeof action.label === 'function' ? action.label(item) : action.label;

  const getActionIcon = (action: Action<T>, item: T) =>
    typeof action.icon === 'function' ? action.icon(item) : action.icon;

  const getActionClassName = (action: Action<T>, item: T) =>
    typeof action.className === 'function' ? action.className(item) : (action.className || '');

  const handleRowClick = (item: T) => {
    if (onRowClick) {
      onRowClick(item);
    }
  };

  const getRowClassName = (item: T, index: number) => {
    const baseClass = typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName;
    const clickableClass = onRowClick ? 'cursor-pointer' : '';
    return `${baseClass} ${clickableClass}`.trim();
  };

  const renderLoadingSkeleton = () => {
    if (variant === 'table') {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded-lg w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded-lg w-1/6"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded-lg w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded-lg w-1/6"></div>
              </div>
              <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEmptyState = () => {
    const defaultEmptyState = {
      title: 'No data found',
      description: 'There are no items to display at the moment.',
      icon: (
        <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    };

    const empty = emptyState || defaultEmptyState;

    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
          {empty.icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{empty.title}</h3>
        <p className="text-gray-500 text-lg">{htmlToPlainText(empty.description)}</p>
      </div>
    );
  };

  const renderTableVariant = () => (
    <div
      className={`w-full rounded-xl border border-gray-200 bg-white shadow-sm ${
        fitViewport ? 'overflow-hidden' : 'overflow-x-auto overflow-y-visible'
      }`}
    >
      <table className={`w-full ${fitViewport ? 'table-fixed' : 'min-w-[800px]'}`}>
        <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key} 
                className={`${fitViewport ? 'px-2 py-2.5 text-[11px]' : 'px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm'} text-left font-semibold text-gray-700 uppercase tracking-wide ${fitViewport ? '' : 'whitespace-nowrap'} ${column.width || 'w-auto'} ${column.headerClassName || ''}`}
              >
                {column.label}
              </th>
            ))}
            {actions.length > 0 && (
              <th className={`${fitViewport ? 'px-2 py-2.5 text-[11px]' : 'px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm'} text-center font-semibold text-gray-700 uppercase tracking-wide ${fitViewport ? '' : 'sticky right-0 bg-gradient-to-l from-blue-50 to-gray-50 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]'} ${actionColumnWidthClass}`}>
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {safeData.map((item, index) => (
            <tr 
              key={getItemId(item) || `row-${index}`}
              className={`group hover:bg-gray-50 transition-colors duration-200 ${getRowClassName(item, index)}`}
              onClick={() => handleRowClick(item)}
            >
              {columns.map((column) => (
                <td 
                  key={column.key} 
                  className={`${fitViewport ? 'px-2 py-2.5 text-xs' : 'px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm'} text-gray-900 ${fitViewport ? '' : 'whitespace-nowrap'} ${column.width || 'w-auto'} ${column.className || ''}`}
                >
                  {column.render ? column.render(item, index) : (item as any)[column.key]}
                </td>
              ))}
              {actions.length > 0 && (
                <td className={`px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] ${actionColumnWidthClass}`}>
                  {actionDisplay === 'buttons' ? (
                    <div className="flex items-center gap-2">
                      {actions.map((action) => (
                        <Button
                          key={action.key}
                          variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                          size="icon"
                          className={`h-8 w-8 ${
                            action.variant === 'destructive'
                              ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                              : ''
                          } ${getActionClassName(action, item)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(action, item);
                          }}
                          title={getActionLabel(action, item)}
                        >
                          {getActionIcon(action, item)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-start">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="sr-only">Open menu</span>
                            <LuEllipsis className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
                          {actions.map((action) => (
                            <DropdownMenuItem 
                              key={action.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionClick(action, item);
                              }}
                              className={`cursor-pointer text-gray-700 ${
                                action.variant === 'destructive' 
                                  ? 'hover:bg-red-50 text-red-600 focus:text-red-600' 
                                  : action.variant === 'secondary'
                                  ? 'hover:bg-gray-50'
                                  : 'hover:bg-blue-50'
                              }`}
                            >
                              {getActionIcon(action, item) && <span className="mr-3">{getActionIcon(action, item)}</span>}
                              <span>{getActionLabel(action, item)}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCardActions = (item: T) => {
    if (actions.length === 0) return null;
    return (
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 sm:h-8 sm:w-8 p-0 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm border border-gray-200/80 touch-manipulation"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open actions</span>
              <LuEllipsis className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-56 sm:w-48 bg-white border border-gray-200 shadow-xl rounded-xl py-2 min-w-[12rem]"
          >
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.key}
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick(action, item);
                }}
                className={`cursor-pointer py-3 px-4 text-base sm:text-sm rounded-lg mx-1 my-0.5 flex items-center gap-3 ${
                  action.variant === 'destructive'
                    ? 'hover:bg-red-50 text-red-600 focus:text-red-600 focus:bg-red-50'
                    : action.variant === 'secondary'
                    ? 'hover:bg-gray-50 focus:bg-gray-50'
                    : 'hover:bg-blue-50 focus:bg-blue-50 text-gray-900'
                }`}
              >
                {getActionIcon(action, item) && (
                  <span className="flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-4 sm:[&>svg]:h-4">
                    {getActionIcon(action, item)}
                  </span>
                )}
                <span className="font-medium">{getActionLabel(action, item)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderRecordFields = (item: T, index: number) => (
    <StaffRecordFields>
      {columns.map((column, colIndex) => (
        <StaffRecordField
          key={column.key}
          label={column.label}
          fullWidth={column.mobileFullWidth ?? colIndex === 0}
          className={column.className}
        >
          {column.render ? column.render(item, index) : (item as any)[column.key]}
        </StaffRecordField>
      ))}
    </StaffRecordFields>
  );

  const renderMobileRecordCards = () => (
    <div className="grid grid-cols-1 gap-3">
      {safeData.map((item, index) => (
        <StaffMobileRecordCard
          key={getItemId(item) || `row-${index}`}
          className={cn('hover:border-blue-200', getRowClassName(item, index))}
          actions={renderCardActions(item)}
        >
          <div onClick={() => handleRowClick(item)}>{renderRecordFields(item, index)}</div>
        </StaffMobileRecordCard>
      ))}
    </div>
  );

  const renderCardsVariant = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {safeData.map((item, index) => (
        <StaffMobileRecordCard
          key={getItemId(item) || `row-${index}`}
          className={cn(
            'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md',
            getRowClassName(item, index),
          )}
          actions={renderCardActions(item)}
        >
          <div onClick={() => handleRowClick(item)}>{renderRecordFields(item, index)}</div>
        </StaffMobileRecordCard>
      ))}
    </div>
  );

  const renderListVariant = () => (
    <div className="space-y-2">
      {safeData.map((item, index) => (
        <div 
          key={getItemId(item) || `row-${index}`}
          className={`group bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200 ${getRowClassName(item, index)}`}
          onClick={() => handleRowClick(item)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {columns.map((column) => (
                <div key={column.key} className={`${column.className || ''} ${column.width || 'flex-1'}`}>
                  {column.render ? column.render(item, index) : (item as any)[column.key]}
                </div>
              ))}
            </div>
            {actions.length > 0 && (
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="sr-only">Open menu</span>
                      <LuEllipsis className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
                    {actions.map((action) => (
                      <DropdownMenuItem 
                        key={action.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(action, item);
                        }}
                        className={`cursor-pointer ${
                          action.variant === 'destructive' 
                            ? 'hover:bg-red-50 text-red-600 focus:text-red-600' 
                            : action.variant === 'secondary'
                            ? 'hover:bg-gray-50'
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        {getActionIcon(action, item) && <span className="mr-3">{getActionIcon(action, item)}</span>}
                        <span>{getActionLabel(action, item)}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderPagination = () => {
    if (!pagination || pagination.pages <= 1) return null;

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
            <span className="font-semibold text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-semibold text-gray-900">{pagination.total}</span> items
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              className="h-9 px-3 hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <LuChevronsLeft className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">First</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="h-9 px-3 hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Prev</span>
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const page = i + 1;
                const isActive = pagination.page === page;
                return (
                  <Button
                    key={page}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => pagination.onPageChange(page)}
                    className={`h-9 w-9 p-0 ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg' 
                        : 'hover:bg-blue-50 hover:border-blue-200 transition-colors'
                    }`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="h-9 px-3 hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <span className="mr-1 hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.pages)}
              disabled={pagination.page === pagination.pages}
              className="h-9 px-3 hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <span className="mr-1 hidden sm:inline">Last</span>
              <LuChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className={className}>{renderLoadingSkeleton()}</div>;
  }

  if (safeData.length === 0) {
    return <div className={className}>{renderEmptyState()}</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {variant === 'table' && (
        <>
          {/* Mobile: card layout for touch-friendly use */}
          <div className="block md:hidden">
            {renderMobileRecordCards()}
          </div>
          {/* Tablet/Desktop: scrollable table */}
          <div className="hidden md:block">
            {renderTableVariant()}
          </div>
        </>
      )}
      {variant === 'cards' && renderCardsVariant()}
      {variant === 'list' && renderListVariant()}
      {renderPagination()}
    </div>
  );
}
