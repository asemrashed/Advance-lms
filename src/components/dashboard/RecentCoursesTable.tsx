'use client';

import Link from 'next/link';
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
import { LuExternalLink as ExternalLink } from 'react-icons/lu';

export type RecentCourseRow = {
  id: string;
  title: string;
  price: number;
  status: string;
  courseType: 'live' | 'recorded';
  enrollmentCount: number;
  createdAt: string;
};

type RecentCoursesTableProps = {
  courses: RecentCourseRow[];
  loading?: boolean;
  builderHref: (courseId: string) => string;
  viewAllHref: string;
};

export function RecentCoursesTable({
  courses,
  loading = false,
  builderHref,
  viewAllHref,
}: RecentCoursesTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-gray-500">
        No courses yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead>Course</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Enrollments</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="max-w-[220px] font-medium text-gray-900">
                  <span className="line-clamp-1">{course.title}</span>
                </TableCell>
                <TableCell>
                  {course.courseType === 'live' ? (
                    <Badge className="bg-violet-100 text-violet-800">Live</Badge>
                  ) : (
                    <Badge className="bg-sky-100 text-sky-800">Recorded</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{course.status}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {course.enrollmentCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {course.price > 0 ? formatBdt(course.price) : 'Free'}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {new Date(course.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={builderHref(course.id)} className="gap-1">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Builder
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={viewAllHref}>View all courses</Link>
        </Button>
      </div>
    </div>
  );
}
