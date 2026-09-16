'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageSection from '@/components/dashboard/lp/PageSection';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LuBookOpen as BookOpen,
  LuRadio as Radio,
  LuVideo as Video,
  LuPlus as Plus,
  LuExternalLink as ExternalLink,
} from 'react-icons/lu';
import { coursesStaffService } from '@/services/coursesStaffService';
import type { Course, CourseType } from '@/types/course';

type Tab = 'live' | 'recorded';

type StaffCoursesOverviewSectionProps = {
  role: 'admin' | 'instructor';
  coursesHref: string;
  builderHref: (courseId: string) => string;
  compact?: boolean;
  /** stacked = live section then recorded (admin); tabs = original toggle UI */
  layout?: 'tabs' | 'stacked';
};

function typeBadge(type: CourseType | undefined) {
  return (type || 'recorded') === 'live' ? (
    <Badge className="bg-violet-100 text-violet-800">Live</Badge>
  ) : (
    <Badge className="bg-sky-100 text-sky-800">Recorded</Badge>
  );
}

function CourseCardGrid({
  courses,
  loading,
  emptyLabel,
  builderHref,
  limit,
}: {
  courses: Course[];
  loading: boolean;
  emptyLabel: string;
  builderHref: (courseId: string) => string;
  limit: number;
}) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">Loading courses…</div>
    );
  }
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-8 text-center text-gray-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {courses.slice(0, limit).map((course) => (
        <Card key={course._id} className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {typeBadge(course.courseType)}
                <Badge variant="outline">{course.status}</Badge>
              </div>
              <p className="font-semibold text-gray-900 line-clamp-1">{course.title}</p>
              <p className="mt-1 text-xs text-gray-500">
                {(course.courseType || 'recorded') === 'live'
                  ? 'Manage batches in course builder'
                  : course.isPaid
                    ? 'Paid recorded course'
                    : 'Free recorded course'}
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={builderHref(course._id)} className="gap-1 shrink-0">
                <ExternalLink className="h-3.5 w-3.5" />
                Builder
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StaffCoursesOverviewSection({
  role,
  coursesHref,
  builderHref,
  compact = false,
  layout = 'tabs',
}: StaffCoursesOverviewSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('live');

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const res = await coursesStaffService.listCourses('limit=500&sortBy=updatedAt&sortOrder=desc');
        const data = await res.json();
        const rows = (data?.data?.courses ?? []) as Course[];
        setCourses(rows);
        const hasLive = rows.some((c) => (c.courseType || 'recorded') === 'live');
        setActiveTab(hasLive ? 'live' : 'recorded');
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const overview = useMemo(() => {
    const live = courses.filter((c) => (c.courseType || 'recorded') === 'live');
    const recorded = courses.filter((c) => (c.courseType || 'recorded') !== 'live');
    const livePublished = live.filter((c) => c.status === 'published').length;
    const recordedPublished = recorded.filter((c) => c.status === 'published').length;
    return {
      liveCount: live.length,
      recordedCount: recorded.length,
      publishedCount: courses.filter((c) => c.status === 'published').length,
      livePublished,
      recordedPublished,
      livePending: live.filter((c) => c.status === 'pending_approval').length,
      recordedPending: recorded.filter((c) => c.status === 'pending_approval').length,
      hasLive: live.length > 0,
      live,
      recorded,
    };
  }, [courses]);

  const limit = compact ? 4 : 6;
  const newCourseHref = role === 'admin' ? '/admin/courses' : '/instructor/courses';

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={coursesHref}>View all</Link>
      </Button>
      <Button size="sm" className="gap-1" onClick={() => router.push(newCourseHref)}>
        <Plus className="h-4 w-4" />
        New course
      </Button>
    </div>
  );

  if (layout === 'stacked') {
    return (
      <div className="mb-6 space-y-6">
        <PageSection
          title="Live Courses"
          description="Live programs with batches and schedules"
          actions={actions}
        >
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Video className="h-8 w-8 text-violet-600" />
                <div>
                  <p className="text-2xl font-bold text-violet-900">{overview.liveCount}</p>
                  <p className="text-sm text-violet-700">Live courses</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="flex items-center gap-3 p-4">
                <BookOpen className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">{overview.livePublished}</p>
                  <p className="text-sm text-green-700">Published live</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Video className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-900">{overview.livePending}</p>
                  <p className="text-sm text-amber-700">Pending approval</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <CourseCardGrid
            courses={overview.live}
            loading={loading}
            emptyLabel="No live courses yet."
            builderHref={builderHref}
            limit={limit}
          />
        </PageSection>

        <PageSection
          title="Recorded Courses"
          description="Self-paced recorded programs"
        >
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-sky-200 bg-sky-50/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Radio className="h-8 w-8 text-sky-600" />
                <div>
                  <p className="text-2xl font-bold text-sky-900">{overview.recordedCount}</p>
                  <p className="text-sm text-sky-700">Recorded courses</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="flex items-center gap-3 p-4">
                <BookOpen className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">{overview.recordedPublished}</p>
                  <p className="text-sm text-green-700">Published recorded</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Radio className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-900">{overview.recordedPending}</p>
                  <p className="text-sm text-amber-700">Pending approval</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <CourseCardGrid
            courses={overview.recorded}
            loading={loading}
            emptyLabel="No recorded courses yet."
            builderHref={builderHref}
            limit={limit}
          />
        </PageSection>
      </div>
    );
  }

  const visible =
    activeTab === 'live' ? overview.live : overview.recorded;

  return (
    <PageSection
      title="Courses"
      description="Live and recorded programs you manage"
      className="mb-6"
      actions={actions}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Video className="h-8 w-8 text-violet-600" />
            <div>
              <p className="text-2xl font-bold text-violet-900">{overview.liveCount}</p>
              <p className="text-sm text-violet-700">Live courses</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Radio className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-2xl font-bold text-sky-900">{overview.recordedCount}</p>
              <p className="text-sm text-sky-700">Recorded courses</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <BookOpen className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">{overview.publishedCount}</p>
              <p className="text-sm text-green-700">Published</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {overview.hasLive && (
        <div className="mb-4 flex gap-2 border-b border-gray-200 pb-1">
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'live' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('live')}
          >
            Live
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'recorded' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('recorded')}
          >
            Recorded
          </Button>
        </div>
      )}

      <CourseCardGrid
        courses={visible}
        loading={loading}
        emptyLabel={`No ${activeTab} courses yet.`}
        builderHref={builderHref}
        limit={limit}
      />
    </PageSection>
  );
}
