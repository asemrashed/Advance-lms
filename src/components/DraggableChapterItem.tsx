'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LuPencil as Edit, LuGripVertical as GripVertical, LuBookOpen as BookOpen, LuPlay as Play, LuTrash2 as Trash2 } from 'react-icons/lu';;
import { Chapter } from '@/types/chapter';
import { htmlToPlainText } from '@/lib/utils';

interface DraggableChapterItemProps {
  chapter: Chapter;
  isSelected: boolean;
  onSelect: (chapter: Chapter) => void;
  onEdit: (chapter: Chapter) => void;
  onDelete?: (chapter: Chapter) => void;
  lessonCount?: number;
}

export default function DraggableChapterItem({
  chapter,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  lessonCount = 0,
}: DraggableChapterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group border rounded-lg p-4 cursor-pointer transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(chapter);
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>

          {/* Chapter LuInfo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 truncate">
                {chapter.title}
              </h3>
              {chapter.isPublished && (
                <Badge variant="secondary" className="text-xs">
                  Published
                </Badge>
              )}
            </div>
            
            {chapter.description && (
              <p className="text-sm text-gray-600 truncate mb-2">
                {htmlToPlainText(chapter.description)}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Order: {chapter.order}</span>
              <div className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                <span>{lessonCount} lessons</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={chapter.isPublished ? 'default' : 'secondary'} className="text-xs">
            {chapter.isPublished ? 'Published' : 'Draft'}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(chapter);
            }}
            className="hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Edit chapter"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(chapter);
              }}
              className="hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors flex-shrink-0"
              title="Delete chapter"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
