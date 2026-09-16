'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { WebsiteContent } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  LuPlus as Plus,
  LuSearch as Search,
  LuLoader as Loader2,
  LuArrowUp,
  LuArrowDown,
  LuX as X,
  LuUsers as Users,
} from 'react-icons/lu';
import { formatInstructorCourseLine } from '@/lib/formatInstructorCourseLine';
import type { Teacher } from '@/types/teacher';
import { teachersStaffService } from '@/services/teachersStaffService';
import { coursesStaffService } from '@/services/coursesStaffService';

type CourseRow = { _id: string; title: string; instructorId?: string };

type InstructorsSectionProps = {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  addFeaturedInstructor: (instructorId: string) => void;
  removeFeaturedInstructor: (instructorId: string) => void;
  moveFeaturedInstructor: (instructorId: string, direction: 'up' | 'down') => void;
};

function instructorName(t: Teacher): string {
  const full = t.name?.trim();
  if (full) return full;
  return t.name?.trim();
}

export function InstructorsSection({
  content,
  updateContent,
  addFeaturedInstructor,
  removeFeaturedInstructor,
  moveFeaturedInstructor,
}: InstructorsSectionProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const selectedIds = content.homeInstructors?.instructorIds ?? [];
  const maxFeatured = 12;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [teachersRes, coursesRes] = await Promise.all([
          teachersStaffService.listTeachers('limit=500&page=1'),
          coursesStaffService.listCourses('limit=500&page=1&status=published'),
        ]);
        if (cancelled) return;

        if (teachersRes.ok) {
          const data = await teachersRes.json();
          setTeachers(Array.isArray(data?.teachers) ? data.teachers : []);
        } else {
          setTeachers([]);
        }

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          const list = data?.data?.courses ?? data?.courses ?? [];
          setCourses(
            Array.isArray(list)
              ? list.map((c: Record<string, unknown>) => ({
                  _id: String(c._id),
                  title: String(c.title || ''),
                  instructorId: c.instructor
                    ? String(
                        typeof c.instructor === 'object' && c.instructor !== null
                          ? (c.instructor as { _id?: string })._id
                          : c.instructor,
                      )
                    : undefined,
                }))
              : [],
          );
        } else {
          setCourses([]);
        }
      } catch {
        if (!cancelled) {
          setTeachers([]);
          setCourses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const coursesByInstructor = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const course of courses) {
      if (!course.instructorId || !course.title) continue;
      const list = map.get(course.instructorId) ?? [];
      if (!list.includes(course.title)) list.push(course.title);
      map.set(course.instructorId, list);
    }
    return map;
  }, [courses]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = instructorName(t).toLowerCase();
      return (
        name.includes(q) ||
        t.phone?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      );
    });
  }, [teachers, search]);

  const hi = content.homeInstructors;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Homepage Instructors
          </CardTitle>
          <CardDescription>
            Choose which instructors appear in the &quot;Meet Our Expert Mentors&quot; section on the
            home page. Order controls carousel sequence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Badge label</label>
              <Input
                value={hi?.badgeLabel ?? ''}
                onChange={(e) => updateContent(['homeInstructors', 'badgeLabel'], e.target.value)}
                placeholder="Our Mentors"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Section heading</label>
              <Input
                value={hi?.sectionHeading ?? ''}
                onChange={(e) =>
                  updateContent(['homeInstructors', 'sectionHeading'], e.target.value)
                }
                placeholder="Meet Our Expert Mentors"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Section subtitle</label>
            <Textarea
              value={hi?.sectionSubtitle ?? ''}
              onChange={(e) =>
                updateContent(['homeInstructors', 'sectionSubtitle'], e.target.value)
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Featured on homepage</CardTitle>
            <Badge variant="outline">
              {selectedIds.length}/{maxFeatured}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No instructors selected. The home page will fall back to static mentor placeholders
              until you add instructors here.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedIds.map((id, index) => {
                const teacher = teachers.find((t) => t._id === id);
                const courseTitles = coursesByInstructor.get(id) ?? [];
                const previewLine = formatInstructorCourseLine(courseTitles);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Badge variant="secondary" className="shrink-0">
                        {index + 1}
                      </Badge>
                      {teacher?.avatar ? (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={teacher.avatar}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
                          ?
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {teacher ? instructorName(teacher) : `Unknown (${id})`}
                        </p>
                        <p className="truncate text-xs text-gray-500">{previewLine}</p>
                        {teacher?.experience?.trim() ? (
                          <p className="truncate text-xs text-gray-400">
                            {teacher.experience.trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === 0}
                        onClick={() => moveFeaturedInstructor(id, 'up')}
                      >
                        <LuArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === selectedIds.length - 1}
                        onClick={() => moveFeaturedInstructor(id, 'down')}
                      >
                        <LuArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => removeFeaturedInstructor(id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All instructors</CardTitle>
          <CardDescription>
            Active and inactive accounts are listed. Only active instructors appear on the public
            home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by name, phone, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading instructors…
            </div>
          ) : filteredTeachers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No instructors found.</p>
          ) : (
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {filteredTeachers.map((teacher) => {
                const isSelected = selectedIds.includes(teacher._id);
                const courseTitles = coursesByInstructor.get(teacher._id) ?? [];
                const previewLine = formatInstructorCourseLine(courseTitles);
                return (
                  <div
                    key={teacher._id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                      isSelected ? 'border-green-200 bg-green-50/40' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {teacher.avatar ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={teacher.avatar}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                          <Users className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {instructorName(teacher)}
                          </span>
                          {!teacher.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{previewLine}</p>
                        {teacher.experience?.trim() ? (
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {teacher.experience.trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? 'outline' : 'default'}
                      disabled={isSelected || selectedIds.length >= maxFeatured}
                      onClick={() => addFeaturedInstructor(teacher._id)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {isSelected ? 'Added' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
