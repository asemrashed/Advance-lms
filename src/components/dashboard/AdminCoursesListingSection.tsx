'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageSection from '@/components/dashboard/lp/PageSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatBdt } from '@/lib/currency';
import { coursesStaffService } from '@/services/coursesStaffService';
import type { Course } from '@/types/course';
import {
  LuExternalLink as ExternalLink,
  LuPlus as Plus,
  LuArrowUpDown as ArrowUpDown,
  LuArrowRight as ArrowRight,
} from 'react-icons/lu';

type CourseTab = 'live' | 'recorded';
type SortKey = 'title' | 'createdAt' | 'enrollmentCount' | 'status' | 'instructor';

const PREVIEW_LIMIT = 8;

type AdminCoursesListingSectionProps = {
  builderHref: (courseId: string) => string;
  coursesHref: string;
  /** Hide Instructor column (useful on instructor dashboard) */
  hideInstructorColumn?: boolean;
};

function statusClass(status: string) {
  switch (status) {
    case 'published':
      return 'text-emerald-600';
    case 'pending_approval':
      return 'text-amber-600';
    case 'draft':
      return 'text-teal-600';
    case 'archived':
      return 'text-orange-600';
    default:
      return 'text-gray-600';
  }
}

function instructorName(course: Course) {
  return (
    course.instructorInfo?.name ||
    (typeof course.instructor === 'object' && course.instructor?.name) ||
    course.createdBy?.name ||
    '—'
  );
}

export function AdminCoursesListingSection({
  builderHref,
  coursesHref,
  hideInstructorColumn = false,
}: AdminCoursesListingSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tab, setTab] = useState<CourseTab>('live');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const res = await coursesStaffService.listCourses(
          'limit=500&sortBy=createdAt&sortOrder=desc',
        );
        const data = await res.json();
        setCourses((data?.data?.courses ?? []) as Course[]);
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const rows = courses.filter((c) =>
      tab === 'live'
        ? (c.courseType || 'recorded') === 'live'
        : (c.courseType || 'recorded') !== 'live',
    );

    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '');
      } else if (sortKey === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      } else if (sortKey === 'enrollmentCount') {
        cmp = (a.enrollmentCount || 0) - (b.enrollmentCount || 0);
      } else if (sortKey === 'instructor') {
        cmp = instructorName(a).localeCompare(instructorName(b));
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [courses, tab, sortKey, sortDir]);

  const previewRows = filtered.slice(0, PREVIEW_LIMIT);
  const viewMoreHref = `${coursesHref}?courseType=${tab}`;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'title' || key === 'status' || key === 'instructor' ? 'asc' : 'desc');
    }
  };

  const SortHead = ({ label, column }: { label: string; column: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className="inline-flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900"
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
    </button>
  );

  return (
    <PageSection
      title="Courses"
      description="Browse live and recorded courses"
      className="mb-6"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={coursesHref}>View all</Link>
          </Button>
          <Button size="sm" className="gap-1" asChild>
            <Link
              href={
                coursesHref.startsWith('/instructor')
                  ? '/instructor/courses/create'
                  : coursesHref.startsWith('/admin')
                    ? '/admin/courses/create'
                    : coursesHref
              }
            >
              <Plus className="h-4 w-4" />
              New course
            </Link>
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === 'live' ? 'default' : 'ghost'}
          onClick={() => setTab('live')}
        >
          Live
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'recorded' ? 'default' : 'ghost'}
          onClick={() => setTab('recorded')}
        >
          Recorded
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white">
              <TableHead>
                <SortHead label="Name" column="title" />
              </TableHead>
              <TableHead>
                <SortHead label="Created" column="createdAt" />
              </TableHead>
              {!hideInstructorColumn ? (
                <TableHead>
                  <SortHead label="Instructor" column="instructor" />
                </TableHead>
              ) : null}
              <TableHead>
                <SortHead label="Students" column="enrollmentCount" />
              </TableHead>
              <TableHead>Price</TableHead>
              <TableHead>
                <SortHead label="Status" column="status" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={hideInstructorColumn ? 6 : 7}>
                    <div className="h-8 animate-pulse rounded bg-gray-100" />
                  </TableCell>
                </TableRow>
              ))
            ) : previewRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hideInstructorColumn ? 6 : 7}
                  className="py-12 text-center text-gray-500"
                >
                  No {tab} courses yet.
                </TableCell>
              </TableRow>
            ) : (
              previewRows.map((course) => {
                const name = instructorName(course);
                const initial = name !== '—' ? name.charAt(0).toUpperCase() : '?';
                return (
                  <TableRow key={course._id} className="hover:bg-gray-50/80">
                    <TableCell className="max-w-[240px] font-medium text-gray-900">
                      <span className="line-clamp-1">{course.title}</span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(course.createdAt).toLocaleDateString('en-GB')}
                    </TableCell>
                    {!hideInstructorColumn ? (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                            {initial}
                          </span>
                          <span className="line-clamp-1 text-gray-700">{name}</span>
                        </div>
                      </TableCell>
                    ) : null}
                    <TableCell className="tabular-nums text-gray-700">
                      {course.enrollmentCount ?? 0}
                    </TableCell>
                    <TableCell>
                      {course.isPaid ? (
                        <span className="tabular-nums text-gray-700">
                          {formatBdt(course.finalPrice ?? course.price ?? 0)}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Free
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium capitalize ${statusClass(course.status)}`}
                      >
                        {course.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => router.push(builderHref(course._id))}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Builder
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && filtered.length > 0 ? (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={viewMoreHref}>
              View more {tab} courses
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : null}
    </PageSection>
  );
}
