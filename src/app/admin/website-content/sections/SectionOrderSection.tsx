'use client';

import type { WebsiteContent } from './types';
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SectionConfig } from '@/lib/websiteContentDefaults';
import {
  DEFAULT_HOME_SECTION_ORDER,
  resolveAdminHomeSectionOrder,
} from '@/lib/homeSectionOrder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LuRefreshCw as RefreshCw, LuSettings as Settings, LuGripVertical } from 'react-icons/lu';
import type { SensorDescriptor } from '@dnd-kit/core';

function DraggableSectionItem({ section, onToggle }: { section: SectionConfig; onToggle: (enabled: boolean) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-[#7B2CBF] hover:shadow-md ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <LuGripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-[#7B2CBF] focus:ring-[#7B2CBF]"
          />
          <span className="font-semibold text-gray-900">{section.label}</span>
          <Badge variant="outline" className="text-xs">
            Order: {section.order}
          </Badge>
        </div>
      </div>
    </div>
  );
}

interface SectionOrderSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  setRecordedCoursesPublicVisibility: (enabled: boolean) => void;
  sensors: SensorDescriptor<any>[];
}

export function SectionOrderSection({
  content,
  updateContent,
  setRecordedCoursesPublicVisibility,
  sensors,
}: SectionOrderSectionProps) {
  return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Section Order Management
                  </CardTitle>
                  <CardDescription>
                    Drag and drop to reorder home page sections (hero → FAQ), or use checkboxes to show/hide them
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const sections = resolveAdminHomeSectionOrder(content.sectionOrder);

                    const handleDragEnd = (event: DragEndEvent) => {
                      const { active, over } = event;

                      if (over && active.id !== over.id) {
                        const oldIndex = sections.findIndex(s => s.id === active.id);
                        const newIndex = sections.findIndex(s => s.id === over.id);

                        const reorderedSections = arrayMove(sections, oldIndex, newIndex);
                    
                        // Update order numbers
                        const updatedSections = reorderedSections.map((section, index) => ({
                          ...section,
                          order: index
                        }));

                        updateContent(['sectionOrder'], updatedSections);
                      }
                    };

                    return (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={sections.map(s => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {sections.map((section) => (
                              <DraggableSectionItem
                                key={section.id}
                                section={section}
                                onToggle={(enabled) => {
                                  if (section.id === 'courses') {
                                    setRecordedCoursesPublicVisibility(enabled);
                                    return;
                                  }
                                  const updatedOrder = resolveAdminHomeSectionOrder(
                                    content.sectionOrder,
                                  ).map((item) =>
                                    item.id === section.id ? { ...item, enabled } : item,
                                  );
                                  updateContent(['sectionOrder'], updatedOrder);
                                }}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    );
                  })()}
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reset to default order
                        const resetOrder = DEFAULT_HOME_SECTION_ORDER.map((section, index) => ({
                          ...section,
                          order: index,
                        }));
                        updateContent(['sectionOrder'], resetOrder);
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset to Default Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
  );
}
