'use client';

import type { WebsiteContent } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Badge } from '@/components/ui/badge';
import { LuPlus as Plus, LuTrash2 as Trash, LuSettings as Settings, LuBriefcase as Briefcase, LuArrowUp, LuArrowDown } from 'react-icons/lu';
interface CoursesSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  activeSubTab: 'courses' | 'coursesByCategory';
  publishedCoursesList: Array<{ _id: string; title: string }>;
  addFeaturedCourse: (courseId: string) => void;
  removeFeaturedCourse: (courseId: string) => void;
  moveFeaturedCourse: (courseId: string, direction: 'up' | 'down') => void;
  onSubTabChange: (tab: 'courses' | 'coursesByCategory') => void;
}

export function CoursesSection({ content, updateContent, activeSubTab, onSubTabChange, publishedCoursesList, addFeaturedCourse, removeFeaturedCourse, moveFeaturedCourse }: CoursesSectionProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
        {([
          { id: 'courses' as const, label: 'Featured Courses' },
          { id: 'coursesByCategory' as const, label: 'Courses by Category' },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSubTabChange(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === tab.id
                ? 'bg-[#7B2CBF]/10 text-[#7B2CBF]'
                : 'text-gray-600 hover:text-[#7B2CBF] hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeSubTab === 'courses' ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Courses Section Settings
                      </CardTitle>
                      <CardDescription>Configure the courses section content</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Label */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Label</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AttractiveInput
                            value={content.courses?.label?.text || ''}
                            onChange={(e) => updateContent(['courses', 'label', 'text'], e.target.value)}
                            placeholder="Label text"
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Background Color</label>
                            <input
                              type="color"
                              value={content.courses?.label?.backgroundColor || '#A855F7'}
                              onChange={(e) => updateContent(['courses', 'label', 'backgroundColor'], e.target.value)}
                              className="h-8 w-16 rounded border"
                            />
                            <Input
                              type="text"
                              value={content.courses?.label?.backgroundColor || '#A855F7'}
                              onChange={(e) => updateContent(['courses', 'label', 'backgroundColor'], e.target.value)}
                              placeholder="#A855F7"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Title Parts */}
                      <div className="space-y-4">
                        <label className="text-sm font-semibold mb-2 block">Title Parts</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <AttractiveInput
                              value={content.courses?.title?.part1 || ''}
                              onChange={(e) => updateContent(['courses', 'title', 'part1'], e.target.value)}
                              placeholder="Title part 1"
                              className="mb-2"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={content.courses?.titleColors?.part1 || '#1E3A8A'}
                                onChange={(e) => {
                                  updateContent(['courses', 'titleColors', 'part1'], e.target.value);
                                }}
                                className="h-8 w-16 rounded border"
                              />
                              <Input
                                type="text"
                                value={content.courses?.titleColors?.part1 || '#1E3A8A'}
                                onChange={(e) => {
                                  updateContent(['courses', 'titleColors', 'part1'], e.target.value);
                                }}
                                placeholder="#1E3A8A"
                                className="flex-1 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <AttractiveInput
                              value={content.courses?.title?.part2 || ''}
                              onChange={(e) => updateContent(['courses', 'title', 'part2'], e.target.value)}
                              placeholder="Title part 2 (will use gradient)"
                              className="mb-2"
                            />
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600">Gradient Colors</label>
                              <div className="flex items-center gap-1 flex-1">
                                <input
                                  type="color"
                                  value={content.courses?.gradientColors?.from || '#10B981'}
                                  onChange={(e) => {
                                    updateContent(['courses', 'gradientColors', 'from'], e.target.value);
                                  }}
                                  className="h-8 w-12 rounded border"
                                />
                                <input
                                  type="color"
                                  value={content.courses?.gradientColors?.via || '#14B8A6'}
                                  onChange={(e) => {
                                    updateContent(['courses', 'gradientColors', 'via'], e.target.value);
                                  }}
                                  className="h-8 w-12 rounded border"
                                />
                                <input
                                  type="color"
                                  value={content.courses?.gradientColors?.to || '#A855F7'}
                                  onChange={(e) => {
                                    updateContent(['courses', 'gradientColors', 'to'], e.target.value);
                                  }}
                                  className="h-8 w-12 rounded border"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <Input
                                type="text"
                                value={content.courses?.gradientColors?.from || '#10B981'}
                                onChange={(e) => {
                                  updateContent(['courses', 'gradientColors', 'from'], e.target.value);
                                }}
                                placeholder="#10B981"
                                className="text-xs"
                              />
                              <Input
                                type="text"
                                value={content.courses?.gradientColors?.via || '#14B8A6'}
                                onChange={(e) => {
                                  updateContent(['courses', 'gradientColors', 'via'], e.target.value);
                                }}
                                placeholder="#14B8A6"
                                className="text-xs"
                              />
                              <Input
                                type="text"
                                value={content.courses?.gradientColors?.to || '#A855F7'}
                                onChange={(e) => {
                                  updateContent(['courses', 'gradientColors', 'to'], e.target.value);
                                }}
                                placeholder="#A855F7"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Button */}
                      <div className="space-y-4">
                        <label className="text-sm font-semibold mb-2 block">Button</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AttractiveInput
                            value={content.courses?.buttonText || ''}
                            onChange={(e) => updateContent(['courses', 'buttonText'], e.target.value)}
                            placeholder="Button text"
                          />
                          <AttractiveInput
                            value={content.courses?.buttonHref || ''}
                            onChange={(e) => updateContent(['courses', 'buttonHref'], e.target.value)}
                            placeholder="Button URL"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Gradient From</label>
                            <input
                              type="color"
                              value={content.courses?.buttonGradientFrom || '#EC4899'}
                              onChange={(e) => updateContent(['courses', 'buttonGradientFrom'], e.target.value)}
                              className="h-8 w-16 rounded border"
                            />
                            <Input
                              type="text"
                              value={content.courses?.buttonGradientFrom || '#EC4899'}
                              onChange={(e) => updateContent(['courses', 'buttonGradientFrom'], e.target.value)}
                              placeholder="#EC4899"
                              className="flex-1 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Gradient To</label>
                            <input
                              type="color"
                              value={content.courses?.buttonGradientTo || '#A855F7'}
                              onChange={(e) => updateContent(['courses', 'buttonGradientTo'], e.target.value)}
                              className="h-8 w-16 rounded border"
                            />
                            <Input
                              type="text"
                              value={content.courses?.buttonGradientTo || '#A855F7'}
                              onChange={(e) => updateContent(['courses', 'buttonGradientTo'], e.target.value)}
                              placeholder="#A855F7"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Featured Courses Order */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold block">Featured Courses (Homepage Card Order)</label>
                          <Badge variant="outline">
                            {(content.courses?.featuredCourseIds ?? []).length}/8
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          Add courses and reorder them. Homepage "আমাদের সবচেয়ে জনপ্রিয় কোর্স" cards follow this order.
                        </p>

                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="mb-2 text-xs font-medium text-gray-600">Add from published courses</p>
                          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                            {publishedCoursesList.length === 0 ? (
                              <p className="text-xs text-gray-500">No published courses found.</p>
                            ) : (
                              publishedCoursesList.map((course) => {
                                const isSelected = (content.courses?.featuredCourseIds ?? []).includes(course._id);
                                return (
                                  <div key={course._id} className="flex items-center justify-between gap-2 rounded-md border border-gray-100 px-2 py-1.5">
                                    <span className="truncate text-sm text-gray-700">{course.title}</span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={isSelected ? 'outline' : 'default'}
                                      disabled={isSelected}
                                      onClick={() => addFeaturedCourse(course._id)}
                                    >
                                      <Plus className="mr-1 h-3.5 w-3.5" />
                                      {isSelected ? 'Added' : 'Add'}
                                    </Button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="mb-2 text-xs font-medium text-gray-600">Selected order</p>
                          {(content.courses?.featuredCourseIds ?? []).length === 0 ? (
                            <p className="text-xs text-gray-500">No featured courses selected. Latest courses will be shown automatically.</p>
                          ) : (
                            <div className="space-y-2">
                              {(content.courses?.featuredCourseIds ?? []).map((courseId, index) => {
                                const matched = publishedCoursesList.find((c) => c._id === courseId);
                                const title = matched?.title || `Unknown course (${courseId})`;
                                return (
                                  <div key={courseId} className="flex items-center justify-between gap-2 rounded-md border border-gray-100 px-2 py-1.5">
                                    <div className="min-w-0 flex items-center gap-2">
                                      <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                                      <span className="truncate text-sm text-gray-700">{title}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        disabled={index === 0}
                                        onClick={() => moveFeaturedCourse(courseId, 'up')}
                                      >
                                        <LuArrowUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        disabled={index === (content.courses?.featuredCourseIds ?? []).length - 1}
                                        onClick={() => moveFeaturedCourse(courseId, 'down')}
                                      >
                                        <LuArrowDown className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        onClick={() => removeFeaturedCourse(courseId)}
                                      >
                                        <Trash className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
      ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Courses By Category Section Settings
                      </CardTitle>
                      <CardDescription>Configure the courses by category section content</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Label */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Label</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AttractiveInput
                            value={content.coursesByCategory?.label?.text || ''}
                            onChange={(e) => updateContent(['coursesByCategory', 'label', 'text'], e.target.value)}
                            placeholder="Label text"
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Background Color</label>
                            <input
                              type="color"
                              value={content.coursesByCategory?.label?.backgroundColor || '#A855F7'}
                              onChange={(e) => updateContent(['coursesByCategory', 'label', 'backgroundColor'], e.target.value)}
                              className="h-8 w-16 rounded border"
                            />
                            <Input
                              type="text"
                              value={content.coursesByCategory?.label?.backgroundColor || '#A855F7'}
                              onChange={(e) => updateContent(['coursesByCategory', 'label', 'backgroundColor'], e.target.value)}
                              placeholder="#A855F7"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Title Parts */}
                      <div className="space-y-4">
                        <label className="text-sm font-semibold mb-2 block">Title Parts</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <AttractiveInput
                              value={content.coursesByCategory?.title?.part1 || ''}
                              onChange={(e) => updateContent(['coursesByCategory', 'title', 'part1'], e.target.value)}
                              placeholder="Title part 1"
                              className="mb-2"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={content.coursesByCategory?.titleColors?.part1 || '#1E3A8A'}
                                onChange={(e) => {
                                  updateContent(['coursesByCategory', 'titleColors', 'part1'], e.target.value);
                                }}
                                className="h-8 w-16 rounded border"
                              />
                              <Input
                                type="text"
                                value={content.coursesByCategory?.titleColors?.part1 || '#1E3A8A'}
                                onChange={(e) => {
                                  updateContent(['coursesByCategory', 'titleColors', 'part1'], e.target.value);
                                }}
                                placeholder="#1E3A8A"
                                className="flex-1 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <AttractiveInput
                              value={content.coursesByCategory?.title?.part2 || ''}
                              onChange={(e) => updateContent(['coursesByCategory', 'title', 'part2'], e.target.value)}
                              placeholder="Title part 2"
                              className="mb-2"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={content.coursesByCategory?.titleColors?.part2 || '#1E3A8A'}
                                onChange={(e) => {
                                  updateContent(['coursesByCategory', 'titleColors', 'part2'], e.target.value);
                                }}
                                className="h-8 w-16 rounded border"
                              />
                              <Input
                                type="text"
                                value={content.coursesByCategory?.titleColors?.part2 || '#1E3A8A'}
                                onChange={(e) => {
                                  updateContent(['coursesByCategory', 'titleColors', 'part2'], e.target.value);
                                }}
                                placeholder="#1E3A8A"
                                className="flex-1 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <AttractiveInput
                              value={content.coursesByCategory?.title?.part3 || ''}
                              onChange={(e) => updateContent(['coursesByCategory', 'title', 'part3'], e.target.value)}
                              placeholder="Title part 3 (will use gradient)"
                              className="mb-2"
                            />
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600">Gradient Colors</label>
                              <div className="flex items-center gap-1 flex-1">
                                <input
                                  type="color"
                                  value={content.coursesByCategory?.gradientColors?.from || '#A855F7'}
                                  onChange={(e) => {
                                    updateContent(['coursesByCategory', 'gradientColors', 'from'], e.target.value);
                                  }}
                                  className="h-8 w-12 rounded border"
                                />
                                <input
                                  type="color"
                                  value={content.coursesByCategory?.gradientColors?.to || '#10B981'}
                                  onChange={(e) => {
                                    updateContent(['coursesByCategory', 'gradientColors', 'to'], e.target.value);
                                  }}
                                  className="h-8 w-12 rounded border"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Input
                                type="text"
                                value={content.coursesByCategory?.gradientColors?.from || '#A855F7'}
                                onChange={(e) => {
                                  updateContent(['coursesByCategory', 'gradientColors', 'from'], e.target.value);
                                }}
                                placeholder="#A855F7"
                                className="text-xs"
                              />
                              <Input
                                type="text"
                                value={content.coursesByCategory?.gradientColors?.to || '#10B981'}
                                onChange={(e) => {
                                  updateContent(['coursesByCategory', 'gradientColors', 'to'], e.target.value);
                                }}
                                placeholder="#10B981"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Button */}
                      <div className="space-y-4">
                        <label className="text-sm font-semibold mb-2 block">Button</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AttractiveInput
                            value={content.coursesByCategory?.buttonText || ''}
                            onChange={(e) => updateContent(['coursesByCategory', 'buttonText'], e.target.value)}
                            placeholder="Button text"
                          />
                          <AttractiveInput
                            value={content.coursesByCategory?.buttonHref || ''}
                            onChange={(e) => updateContent(['coursesByCategory', 'buttonHref'], e.target.value)}
                            placeholder="Button URL"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Gradient From</label>
                            <input
                              type="color"
                              value={content.coursesByCategory?.buttonGradientFrom || '#EC4899'}
                              onChange={(e) => updateContent(['coursesByCategory', 'buttonGradientFrom'], e.target.value)}
                              className="h-8 w-16 rounded border"
                            />
                            <Input
                              type="text"
                              value={content.coursesByCategory?.buttonGradientFrom || '#EC4899'}
                              onChange={(e) => updateContent(['coursesByCategory', 'buttonGradientFrom'], e.target.value)}
                              placeholder="#EC4899"
                              className="flex-1 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Gradient To</label>
                            <input
                              type="color"
                              value={content.coursesByCategory?.buttonGradientTo || '#A855F7'}
                              onChange={(e) => updateContent(['coursesByCategory', 'buttonGradientTo'], e.target.value)}
                              className="h-8 w-16 rounded border"
                            />
                            <Input
                              type="text"
                              value={content.coursesByCategory?.buttonGradientTo || '#A855F7'}
                              onChange={(e) => updateContent(['coursesByCategory', 'buttonGradientTo'], e.target.value)}
                              placeholder="#A855F7"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
      )}
    </>
  );
}
