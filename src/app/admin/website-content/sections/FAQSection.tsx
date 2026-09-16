'use client';

import Image from 'next/image';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CustomEditor from '@/components/custom-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import VideoWatermark from '@/components/VideoWatermark';
import {
  LuRefreshCw as RefreshCw,
  LuPlus as Plus,
  LuTrash2 as Trash,
  LuGlobe as Globe,
  LuPhone as Phone,
  LuMail as Mail,
  LuPalette as Palette,
  LuNavigation as Navigation,
  LuMessageSquare as MessageSquare,
  LuLink as LinkIcon,
  LuSettings as Settings,
  LuSparkles as Sparkles,
  LuInfo as Info,
  LuStar as Star,
  LuChartBar as BarChart,
  LuBriefcase as Briefcase,
  LuAward as Award,
  LuImage as ImageIcon,
  LuFileText as FileText,
  LuDownload as DownloadIcon,
  LuLayoutList as LayoutIcon,
  LuArrowUp,
  LuArrowDown,
  LuGripVertical,
  LuSearch as Search,
  LuLoader as Loader2,
  LuPlay as Play,
  LuEye as Eye,
} from 'react-icons/lu';
import {
  defaultFAQContent,
} from '@/lib/websiteContentDefaults';
import type { WebsiteContent } from './types';


interface FAQSectionProps {
content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
}

export function FAQSection({ content, updateContent }: FAQSectionProps) {
  return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                FAQ Section Settings
              </CardTitle>
              <CardDescription>Configure FAQ content for course detail pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Label */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Label</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AttractiveInput
                    value={content.faq?.label?.text || ''}
                    onChange={(e) => updateContent(['faq', 'label', 'text'], e.target.value)}
                    placeholder="Label text"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Background color</label>
                    <input
                      type="color"
                      value={content.faq?.label?.backgroundColor || '#A855F7'}
                      onChange={(e) => updateContent(['faq', 'label', 'backgroundColor'], e.target.value)}
                      className="h-8 w-16 rounded border"
                    />
                    <Input
                      type="text"
                      value={content.faq?.label?.backgroundColor || '#A855F7'}
                      onChange={(e) => updateContent(['faq', 'label', 'backgroundColor'], e.target.value)}
                      placeholder="#A855F7"
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Title Parts */}
              <div className="space-y-4">
                <label className="text-sm font-semibold mb-2 block">Title parts</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['part1', 'part2'].map((part) => (
                    <div key={part}>
                      <AttractiveInput
                        value={content.faq?.title?.[part as keyof typeof content.faq.title] || ''}
                        onChange={(e) => updateContent(['faq', 'title', part], e.target.value)}
                        placeholder={`Title part ${part === 'part1' ? '1' : '2'}`}
                        className="mb-2"
                      />
                      <div className="flex items-center gap-2">
                        {part === 'part2' && (
                          <button
                            onClick={() => updateContent(['faq', 'titleColors', part], content.faq?.titleColors?.[part as keyof typeof content.faq.titleColors] === 'gradient' ? '#10B981' : 'gradient')}
                            className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                              content.faq?.titleColors?.[part as keyof typeof content.faq.titleColors] === 'gradient'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                          >
                            {content.faq?.titleColors?.[part as keyof typeof content.faq.titleColors] === 'gradient' ? '✓ Gradient' : 'Use gradient'}
                          </button>
                        )}
                        <input
                          type="color"
                          value={content.faq?.titleColors?.[part as keyof typeof content.faq.titleColors] === 'gradient' ? '#10B981' : content.faq?.titleColors?.[part as keyof typeof content.faq.titleColors] || '#1E3A8A'}
                          onChange={(e) => {
                            updateContent(['faq', 'titleColors', part], e.target.value);
                          }}
                          className="h-8 w-16 rounded border"
                          disabled={part === 'part2' && content.faq?.titleColors?.part2 === 'gradient'}
                        />
                        <Input
                          type="text"
                          value={content.faq?.titleColors?.[part as keyof typeof content.faq.titleColors] === 'gradient' ? '#10B981' : content.faq?.titleColors?.[part as keyof typeof content.faq.titleColors] || '#1E3A8A'}
                          onChange={(e) => {
                            if (part === 'part2' && e.target.value === 'gradient') {
                              updateContent(['faq', 'titleColors', part], 'gradient');
                            } else {
                              updateContent(['faq', 'titleColors', part], e.target.value);
                            }
                          }}
                          placeholder={part === 'part1' ? '#1E3A8A' : '#10B981'}
                          className="flex-1 text-xs"
                          disabled={part === 'part2' && content.faq?.titleColors?.part2 === 'gradient'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gradient Colors (if part2 is gradient) */}
              {content.faq?.titleColors?.part2 === 'gradient' && (
                <Card className="p-4 bg-purple-50">
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">Gradient colors</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">From</label>
                          <input
                            type="color"
                            value={content.faq?.gradientColors?.from || '#10B981'}
                            onChange={(e) => updateContent(['faq', 'gradientColors', 'from'], e.target.value)}
                            className="h-8 w-16 rounded border"
                          />
                          <Input
                            type="text"
                            value={content.faq?.gradientColors?.from || '#10B981'}
                            onChange={(e) => updateContent(['faq', 'gradientColors', 'from'], e.target.value)}
                            placeholder="#10B981"
                            className="flex-1 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Via (Optional)</label>
                          <input
                            type="color"
                            value={content.faq?.gradientColors?.via || '#14B8A6'}
                            onChange={(e) => updateContent(['faq', 'gradientColors', 'via'], e.target.value)}
                            className="h-8 w-16 rounded border"
                          />
                          <Input
                            type="text"
                            value={content.faq?.gradientColors?.via || '#14B8A6'}
                            onChange={(e) => updateContent(['faq', 'gradientColors', 'via'], e.target.value)}
                            placeholder="#14B8A6"
                            className="flex-1 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">To</label>
                          <input
                            type="color"
                            value={content.faq?.gradientColors?.to || '#A855F7'}
                            onChange={(e) => updateContent(['faq', 'gradientColors', 'to'], e.target.value)}
                            className="h-8 w-16 rounded border"
                          />
                          <Input
                            type="text"
                            value={content.faq?.gradientColors?.to || '#A855F7'}
                            onChange={(e) => updateContent(['faq', 'gradientColors', 'to'], e.target.value)}
                            placeholder="#A855F7"
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      {/* Preview */}
                      <div className="mt-4 p-4 bg-white rounded-lg border">
                        <p className="text-xs text-gray-600 mb-2">Preview:</p>
                        <div className="text-2xl font-bold">
                          <span style={{ color: content.faq?.titleColors?.part1 || '#1E3A8A' }}>
                            {content.faq?.title?.part1 || 'Frequently Asked'}
                          </span>{" "}
                          <span
                            className="bg-clip-text text-transparent"
                            style={{
                              backgroundImage: content.faq?.gradientColors?.via
                                ? `linear-gradient(to right, ${content.faq.gradientColors.from || '#10B981'}, ${content.faq.gradientColors.via}, ${content.faq.gradientColors.to || '#A855F7'})`
                                : `linear-gradient(to right, ${content.faq?.gradientColors?.from || '#10B981'}, ${content.faq?.gradientColors?.to || '#A855F7'})`,
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }}
                          >
                            {content.faq?.title?.part2 || 'Questions'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          This is how your gradient title will appear on the site
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* FAQ Items */}
              <div className="space-y-4">
                <label className="text-sm font-semibold mb-2 block">FAQ items</label>
                {(content.faq?.faqs && content.faq.faqs.length > 0 ? content.faq.faqs : defaultFAQContent.faqs)
                  .sort((a, b) => a.order - b.order)
                  .map((faq, index) => {
                    const currentFAQs = content.faq?.faqs && content.faq.faqs.length > 0 
                      ? content.faq.faqs 
                      : defaultFAQContent.faqs;
                    return (
                      <Card key={faq.id || index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">FAQ {index + 1}</h4>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  updateContent(['faq', 'faqs'], [...currentFAQs]);
                                }}
                              >
                                Update FAQ
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const newFAQs = currentFAQs.filter((_, i) => i !== index);
                                  updateContent(['faq', 'faqs'], newFAQs.length > 0 ? newFAQs : defaultFAQContent.faqs);
                                }}
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete FAQ
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Question</label>
                            <Input
                              type="text"
                              value={faq.question}
                              onChange={(e) => {
                                const newFAQs = [...currentFAQs];
                                newFAQs[index] = { ...newFAQs[index], question: e.target.value };
                                updateContent(['faq', 'faqs'], newFAQs);
                              }}
                              placeholder="Enter question"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Answer</label>
                            <textarea
                              value={faq.answer}
                              onChange={(e) => {
                                const newFAQs = [...currentFAQs];
                                newFAQs[index] = { ...newFAQs[index], answer: e.target.value };
                                updateContent(['faq', 'faqs'], newFAQs);
                              }}
                              placeholder="Enter answer"
                              rows={4}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#7B2CBF] focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Order</label>
                            <Input
                              type="number"
                              value={faq.order}
                              onChange={(e) => {
                                const newFAQs = [...currentFAQs];
                                newFAQs[index] = { ...newFAQs[index], order: parseInt(e.target.value) || 0 };
                                updateContent(['faq', 'faqs'], newFAQs);
                              }}
                              placeholder="Display order"
                              className="w-full"
                              min="1"
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                {(!content.faq?.faqs || content.faq.faqs.length === 0) && (
                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg text-center">
                    Showing default FAQs. Click &quot;Add FAQ&quot; to add more or edit existing items.
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentFAQs = content.faq?.faqs && content.faq.faqs.length > 0 
                      ? content.faq.faqs 
                      : defaultFAQContent.faqs;
                    const maxId = currentFAQs.length > 0 ? Math.max(...currentFAQs.map(f => f.id)) : 0;
                    const maxOrder = currentFAQs.length > 0 ? Math.max(...currentFAQs.map(f => f.order)) : 0;
                    const newFAQs = [...currentFAQs, { 
                      id: maxId + 1, 
                      question: '',
                      answer: '',
                      order: maxOrder + 1
                    }];
                    updateContent(['faq', 'faqs'], newFAQs);
                  }}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </CardContent>
          </Card>
  );
}
