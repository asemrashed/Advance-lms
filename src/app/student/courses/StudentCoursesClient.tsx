'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import { RoleAreaPageSkeleton } from '@/components/skeletons/DashboardSkeletons';
import { Button } from '@/components/ui/button';
import {
  LuBookOpen as BookOpen,
  LuCalendar as Calendar,
  LuArrowRight as ArrowRight,
  LuChevronDown as ChevronDown,
  LuDownload as Download,
  
  LuFileText as FileText,
  LuFolder as Folder,
  LuFileCheck2 as TestIcon,
  LuClipboardList as AssignmentIcon,
  LuPlay as Play,
  LuVideo as Video,
} from 'react-icons/lu';
import { studentLearningService } from '@/services/studentLearningService';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import { ResourcePdfViewerModal } from '@/components/resources/ResourcePdfViewerModal';
import { StudentPracticeTestModal } from '@/components/exams/StudentPracticeTestModal';
import { useRecordedCoursesEnabled } from '@/hooks/useRecordedCoursesEnabled';
import {
  PUBLIC_ENROLL_HREF,
  RECORDED_COURSES_CATALOG_HREF,
} from '@/lib/studentPortalSettings';
import { triggerBrowserDownload } from '@/lib/triggerBrowserDownload';
import { toDurablePdfPath } from '@/lib/pdfjsClient';

type RecordedRow = Awaited<
  ReturnType<typeof studentLearningService.getMyCourses>
>['recorded'][number];

type LiveGroup = Awaited<
  ReturnType<typeof studentLearningService.getMyCourses>
>['live'][number];

type CourseBundle = Awaited<
  ReturnType<typeof studentLearningService.getCourseBundle>
>;

type CourseLesson = CourseBundle['lessons'][number];

type CourseTab = 'live' | 'recorded';

function chapterIdForLesson(lesson: CourseLesson): string {
  return String(lesson.chapter || '');
}

function formatDate(value?: string): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isPdfAttachment(attachment: { url: string; type?: string }): boolean {
  return (
    attachment.type?.toLowerCase().includes('pdf') === true ||
    /\.pdf(?:$|[?#])/i.test(attachment.url)
  );
}

function isInAppHref(href: string) {
  return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/uploads/');
}

function ResourceCard({
  icon: Icon,
  iconBgClass = "bg-slate-200",
  iconTextClass = "text-slate-700",
  title,
  badge,
  badgeClass = "bg-slate-200 text-slate-700",
  subtitle,
  primaryActionText,
  onPrimaryAction,
  primaryHref,
  secondaryActionText,
  onSecondaryAction,
  secondaryHref,
}: {
  icon: any;
  iconBgClass?: string;
  iconTextClass?: string;
  title: string;
  badge?: string;
  badgeClass?: string;
  subtitle: React.ReactNode;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  primaryHref?: string;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  secondaryHref?: string;
}) {
  const primaryButton = primaryHref ? (
    <Button asChild size="sm" className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white">
      {isInAppHref(primaryHref) ? (
        <Link href={primaryHref}>{primaryActionText}</Link>
      ) : (
        <a href={primaryHref} target="_blank" rel="noreferrer">
          {primaryActionText}
        </a>
      )}
    </Button>
  ) : onPrimaryAction ? (
    <Button size="sm" onClick={onPrimaryAction} className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white">
      {primaryActionText}
    </Button>
  ) : null;

  const secondaryButton = secondaryHref ? (
    <Button asChild size="sm" variant="outline" className="w-full rounded-full">
      {isInAppHref(secondaryHref) ? (
        <Link href={secondaryHref}>{secondaryActionText}</Link>
      ) : (
        <a href={secondaryHref} target="_blank" rel="noreferrer">
          {secondaryActionText}
        </a>
      )}
    </Button>
  ) : onSecondaryAction ? (
    <Button size="sm" variant="outline" onClick={onSecondaryAction} className="w-full rounded-full">
      {secondaryActionText}
    </Button>
  ) : null;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBgClass} ${iconTextClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-2 text-sm font-bold text-slate-900">{title}</p>
            {badge ? (
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${badgeClass}`}>
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {(primaryButton || secondaryButton) ? (
        <div className="mt-auto flex flex-col gap-2 pt-4">
          {secondaryButton}
          {primaryButton}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer ResourceCard — kept for topic drive and chapter-level tests. */
function ResourceRow({
  icon: Icon,
  iconBgClass = "bg-slate-200",
  iconTextClass = "text-slate-700",
  title,
  badge,
  badgeClass = "bg-slate-200 text-slate-700",
  subtitle,
  primaryActionText,
  onPrimaryAction,
  primaryHref,
  secondaryActionText,
  onSecondaryAction,
  secondaryHref,
}: {
  icon: any;
  iconBgClass?: string;
  iconTextClass?: string;
  title: string;
  badge?: string;
  badgeClass?: string;
  subtitle: React.ReactNode;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  primaryHref?: string;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  secondaryHref?: string;
}) {
  const primaryButton = primaryHref ? (
    <Button asChild size="sm" className="shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white">
      {isInAppHref(primaryHref) ? (
        <Link href={primaryHref}>{primaryActionText}</Link>
      ) : (
        <a href={primaryHref} target="_blank" rel="noreferrer">
          {primaryActionText}
        </a>
      )}
    </Button>
  ) : onPrimaryAction ? (
    <Button size="sm" onClick={onPrimaryAction} className="shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white">
      {primaryActionText}
    </Button>
  ) : null;

  const secondaryButton = secondaryHref ? (
    <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full">
      {isInAppHref(secondaryHref) ? (
        <Link href={secondaryHref}>{secondaryActionText}</Link>
      ) : (
        <a href={secondaryHref} target="_blank" rel="noreferrer">
          {secondaryActionText}
        </a>
      )}
    </Button>
  ) : onSecondaryAction ? (
    <Button size="sm" variant="outline" onClick={onSecondaryAction} className="shrink-0 rounded-full">
      {secondaryActionText}
    </Button>
  ) : null;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-100/80 px-4 py-3 transition hover:bg-slate-100">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBgClass} ${iconTextClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-bold text-slate-900">
            {title}
          </span>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${badgeClass}`}>
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {subtitle}
        </span>
      </span>
      <div className="flex items-center gap-2">
        {secondaryButton}
        {primaryButton}
      </div>
    </div>
  );
}

export default function StudentCourses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { recordedCoursesEnabled, liveEnrollmentEnabled, ready } =
    useRecordedCoursesEnabled();
  const [loading, setLoading] = useState(true);
  const [recorded, setRecorded] = useState<RecordedRow[]>([]);
  const [live, setLive] = useState<LiveGroup[]>([]);
  const showRecordedTab = recordedCoursesEnabled || recorded.length > 0;
  const [activeTab, setActiveTab] = useState<CourseTab>('recorded');
  const [selectedKey, setSelectedKey] = useState('');
  const [bundle, setBundle] = useState<CourseBundle | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [expandedLessonId, setExpandedLessonId] = useState('');
  const [modalLesson, setModalLesson] = useState<CourseLesson | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{
    title: string;
    url: string | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  const syncUrl = useCallback(
    (next: {
      tab: CourseTab;
      courseId?: string;
      batchId?: string;
      chapterId?: string;
    }) => {
      const params = new URLSearchParams();
      params.set('tab', next.tab);
      if (next.courseId) params.set('courseId', next.courseId);
      if (next.batchId) params.set('batchId', next.batchId);
      if (next.chapterId) params.set('chapterId', next.chapterId);
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      const current = searchParams.toString();
      if (current === qs) return;
      router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const selectLiveCourse = useCallback(
    (courseId: string, batchId: string, chapterId?: string) => {
      const key = `${courseId}:${batchId}`;
      setActiveTab('live');
      setSelectedKey(key);
      if (chapterId) setSelectedChapterId(chapterId);
      syncUrl({
        tab: 'live',
        courseId,
        batchId,
        chapterId: chapterId || undefined,
      });
    },
    [syncUrl],
  );

  const selectRecordedCourse = useCallback(
    (courseId: string, chapterId?: string) => {
      setActiveTab('recorded');
      setSelectedKey(courseId);
      if (chapterId) setSelectedChapterId(chapterId);
      syncUrl({
        tab: 'recorded',
        courseId,
        chapterId: chapterId || undefined,
      });
    },
    [syncUrl],
  );

  const openPdf = (title: string, url: string) => {
    // Prefer durable /api/files/pdf/... over /uploads/pdf/... (missing on many live hosts).
    setPdfPreview({ title, url: toDurablePdfPath(url), loading: false, error: null });
  };

    const downloadWorksheet = async (
    worksheet: NonNullable<CourseLesson['worksheet']>,
  ) => {
    try {
      const response = await fetch(
        `/api/resource-worksheets/${encodeURIComponent(worksheet._id)}/view`,
      );
      const data = await response.json();
      if (!response.ok || !data.success || !data.data?.url) {
        throw new Error(data.error || 'Failed to get worksheet URL');
      }
      triggerBrowserDownload(String(data.data.url), `${worksheet.title}.pdf`);
    } catch (error) {
      console.error('Failed to download worksheet:', error);
      alert('Failed to download worksheet. Please try again later.');
    }
  };

  const openWorksheet = async (
    worksheet: NonNullable<CourseLesson['worksheet']>,
  ) => {
    setPdfPreview({
      title: worksheet.title,
      url: null,
      loading: true,
      error: null,
    });
    try {
      const response = await fetch(
        `/api/resource-worksheets/${encodeURIComponent(worksheet._id)}/view`,
      );
      const data = await response.json();
      if (!response.ok || !data.success || !data.data?.url) {
        throw new Error(data.error || 'Failed to open worksheet');
      }
      setPdfPreview({
        title: worksheet.title,
        url: String(data.data.url),
        loading: false,
        error: null,
      });
    } catch (error) {
      setPdfPreview({
        title: worksheet.title,
        url: null,
        loading: false,
        error:
          error instanceof Error ? error.message : 'Failed to open worksheet',
      });
    }
  };

  useEffect(() => {
    if (status === 'loading' || !ready) return;
    if (!session?.user?.id) return;

    void (async () => {
      try {
        setLoading(true);
        const data = await studentLearningService.getMyCourses();
        setRecorded(data.recorded);
        setLive(data.live);

        const urlTab = searchParams.get('tab');
        const urlCourseId = searchParams.get('courseId') || '';
        const urlBatchId = searchParams.get('batchId') || '';
        const urlChapterId = searchParams.get('chapterId') || '';

        const liveMatchByBatch = urlBatchId
          ? data.live.find((c) =>
              c.batches.some((b) => b.batchId === urlBatchId),
            )
          : undefined;
        const liveMatch = urlCourseId
          ? data.live.find((c) => c.courseId === urlCourseId)
          : liveMatchByBatch;
        const liveBatch =
          liveMatch?.batches.find((b) => b.batchId === urlBatchId) ||
          liveMatch?.batches[0];
        const recordedMatch = urlCourseId
          ? data.recorded.find((c) => c.courseId === urlCourseId)
          : undefined;

        const preferLive =
          urlTab === 'live' ||
          Boolean(urlBatchId && liveMatch) ||
          (!urlTab && Boolean(liveMatch)) ||
          (urlTab !== 'recorded' && !recordedMatch && Boolean(data.live[0]));

        if (preferLive && liveMatch && liveBatch) {
          setActiveTab('live');
          setSelectedKey(`${liveMatch.courseId}:${liveBatch.batchId}`);
          if (urlChapterId) setSelectedChapterId(urlChapterId);
          syncUrl({
            tab: 'live',
            courseId: liveMatch.courseId,
            batchId: liveBatch.batchId,
            chapterId: urlChapterId || undefined,
          });
        } else if (recordedMatch) {
          setActiveTab('recorded');
          setSelectedKey(recordedMatch.courseId);
          if (urlChapterId) setSelectedChapterId(urlChapterId);
          syncUrl({
            tab: 'recorded',
            courseId: recordedMatch.courseId,
            chapterId: urlChapterId || undefined,
          });
        } else {
          const firstLive = data.live[0];
          const firstLiveBatch = firstLive?.batches[0];
          if (firstLive && firstLiveBatch) {
            setActiveTab('live');
            setSelectedKey(`${firstLive.courseId}:${firstLiveBatch.batchId}`);
            syncUrl({
              tab: 'live',
              courseId: firstLive.courseId,
              batchId: firstLiveBatch.batchId,
            });
          } else if (data.recorded[0]) {
            setActiveTab('recorded');
            setSelectedKey(data.recorded[0].courseId);
            syncUrl({
              tab: 'recorded',
              courseId: data.recorded[0].courseId,
            });
          } else {
            setActiveTab('live');
            setSelectedKey('');
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from URL after auth/courses ready
  }, [ready, recordedCoursesEnabled, status, session?.user?.id]);

  useEffect(() => {
    if (!ready) return;
    if (!showRecordedTab && activeTab === 'recorded') {
      setActiveTab('live');
      const course = live[0];
      const batch = course?.batches[0];
      if (course && batch) {
        setSelectedKey(`${course.courseId}:${batch.batchId}`);
        syncUrl({
          tab: 'live',
          courseId: course.courseId,
          batchId: batch.batchId,
        });
      } else {
        setSelectedKey('');
      }
    }
  }, [activeTab, live, ready, showRecordedTab, syncUrl]);

  const selectedLive = useMemo(() => {
    if (activeTab !== 'live') return null;
    const [courseId, batchId] = selectedKey.split(':');
    const course = live.find((item) => item.courseId === courseId);
    const batch = course?.batches.find((item) => item.batchId === batchId);
    return course && batch ? { course, batch } : null;
  }, [activeTab, live, selectedKey]);

  const selectedRecorded = useMemo(
    () =>
      activeTab === 'recorded'
        ? recorded.find((item) => item.courseId === selectedKey) ?? null
        : null,
    [activeTab, recorded, selectedKey],
  );

  const selectedCourseId =
    selectedLive?.course.courseId ?? selectedRecorded?.courseId ?? '';
  const selectedBatchId = selectedLive?.batch.batchId;

  useEffect(() => {
    if (!selectedCourseId) {
      setBundle(null);
      setSelectedChapterId('');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setBundleLoading(true);
        const data = await studentLearningService.getCourseBundle(selectedCourseId, {
          batchId: selectedBatchId,
        });
        if (cancelled) return;
        setBundle(data);
        const preferredChapter =
          (searchParams.get('chapterId') || selectedChapterId || '').trim();
        const nextChapter =
          preferredChapter &&
          data.chapters.some((c) => c._id === preferredChapter)
            ? preferredChapter
            : data.chapters[0]?._id ?? '';
        setSelectedChapterId(nextChapter);
        setExpandedLessonId('');
        if (activeTab === 'live' && selectedBatchId) {
          syncUrl({
            tab: 'live',
            courseId: selectedCourseId,
            batchId: selectedBatchId,
            chapterId: nextChapter || undefined,
          });
        } else if (activeTab === 'recorded') {
          syncUrl({
            tab: 'recorded',
            courseId: selectedCourseId,
            chapterId: nextChapter || undefined,
          });
        }
      } catch (error) {
        console.error('Error fetching course content:', error);
        if (!cancelled) {
          setBundle(null);
          setSelectedChapterId('');
        }
      } finally {
        if (!cancelled) setBundleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chapter restored from URL on course change
  }, [selectedBatchId, selectedCourseId]);

  const selectTab = (tab: CourseTab) => {
    setActiveTab(tab);
    setModalLesson(null);
    if (tab === 'live') {
      const course = live[0];
      const batch = course?.batches[0];
      if (course && batch) {
        selectLiveCourse(course.courseId, batch.batchId);
      } else {
        setSelectedKey('');
        syncUrl({ tab: 'live' });
      }
    } else if (recorded[0]) {
      selectRecordedCourse(recorded[0].courseId);
    } else {
      setSelectedKey('');
      syncUrl({ tab: 'recorded' });
    }
  };

  const selectedChapter =
    bundle?.chapters.find((chapter) => chapter._id === selectedChapterId) ??
    bundle?.chapters[0];
  const chapterLessons = (bundle?.lessons ?? [])
    .filter(
      (lesson) =>
        selectedChapter && chapterIdForLesson(lesson) === selectedChapter._id,
    )
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const chapterTests = (bundle?.tests ?? []).filter(
    (test) => selectedChapter && test.chapter === selectedChapter._id,
  );
  const chapterLevelTests = chapterTests.filter((test) => !test.lesson);
  const progress = selectedRecorded?.progress ?? 0;
  const courseTitle =
    selectedLive?.course.courseTitle ??
    selectedRecorded?.courseLuInfo?.title ??
    bundle?.course.title ??
    'Course';
  const subject =
    selectedLive?.course.subject ??
    selectedRecorded?.courseLuInfo?.category ??
    (typeof bundle?.course.category === 'string' ? bundle.course.category : null) ??
    'General';
  const instructorName = (() => {
    const instructor = bundle?.course.instructor;
    if (instructor && typeof instructor === 'object' && instructor.name) {
      return instructor.name;
    }
    const createdBy = bundle?.course.createdBy;
    if (createdBy && typeof createdBy === 'object' && createdBy.name) {
      return createdBy.name;
    }
    return 'Instructor';
  })();
  const courseMeta = selectedLive
    ? `${instructorName} · ${selectedLive.batch.batchName}`
    : instructorName;

  if (loading) {
    return (
      <StudentRoleShell>
        <RoleAreaPageSkeleton />
      </StudentRoleShell>
    );
  }

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-4 sm:p-6">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              My Courses
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Access materials, worksheets, and live classes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
              📅{' '}
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">
              {session?.user?.name?.trim().charAt(0).toUpperCase() || 'S'}
            </span>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={activeTab === 'live' ? 'default' : 'outline'}
              onClick={() => selectTab('live')}
              className="gap-2 rounded-full data-[variant=default]:bg-emerald-700"
            >
              <Calendar className="h-4 w-4" />
              Live
            </Button>
            {showRecordedTab ? (
              <Button
                type="button"
                variant={activeTab === 'recorded' ? 'default' : 'outline'}
                onClick={() => selectTab('recorded')}
                className="gap-2 rounded-full data-[variant=default]:bg-emerald-700"
              >
                <BookOpen className="h-4 w-4" />
                Recorded
              </Button>
            ) : null}
          </div>
          {ready ? (
            <div className="flex flex-wrap items-center gap-2">
              {liveEnrollmentEnabled ? (
                <Button
                  asChild
                  variant="outline"
                  className="shrink-0 gap-2 rounded-full"
                >
                  <Link href={PUBLIC_ENROLL_HREF}>
                    Enroll more
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              {recordedCoursesEnabled ? (
                <Button
                  asChild
                  variant="outline"
                  className="shrink-0 gap-2 rounded-full"
                >
                  <Link href={RECORDED_COURSES_CATALOG_HREF}>
                    Browse all courses
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {activeTab === 'live'
            ? live.flatMap((course) =>
                course.batches.map((batch) => {
                  const key = `${course.courseId}:${batch.batchId}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        selectLiveCourse(course.courseId, batch.batchId)
                      }
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        selectedKey === key
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      {course.courseTitle}
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        · {batch.batchName}
                      </span>
                    </button>
                  );
                }),
              )
            : recorded.map((course) => (
                <button
                  key={course._id}
                  type="button"
                  onClick={() => selectRecordedCourse(course.courseId)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    selectedKey === course.courseId
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  {course.courseLuInfo?.title ?? 'Course'}
                </button>
              ))}
        </div>

        {!selectedCourseId ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            No {activeTab} courses are available yet.
          </div>
        ) : (
          <>
            <section className="mb-5 flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-6 text-white shadow-lg">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">
                  {subject}
                  {selectedLive ? ` · Grade ${selectedLive.batch.grade}` : ''}
                </span>
                <h2 className="mt-3 text-xl font-black sm:text-2xl">{courseTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {courseMeta}
                  {selectedLive?.batch.startDate
                    ? ` · ${formatDate(selectedLive.batch.startDate)}`
                    : ''}
                </p>
              </div>
              <div className="flex gap-7 sm:gap-10">
                <div className="text-center">
                  <strong className="block text-xl font-black">
                    {bundle?.chapters.length ?? 0}
                  </strong>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Topics
                  </span>
                </div>
                <div className="text-center">
                  <strong className="block text-xl font-black">{Math.round(progress)}%</strong>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Complete
                  </span>
                </div>
                <div className="text-center">
                  <strong className="block text-xl font-black">
                    {selectedLive ? '—' : recorded.length}
                  </strong>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {selectedLive ? 'Attendance' : 'Courses'}
                  </span>
                </div>
              </div>
            </section>

            {bundleLoading ? (
              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ) : bundle ? (
              <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-5">
                  <div className="border-b border-slate-200 px-4 py-3 text-sm font-black text-slate-900">
                    Topics
                  </div>
                  {bundle.chapters.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-slate-500">
                      No topics have been added to this course yet.
                    </p>
                  ) : (
                    bundle.chapters.map((chapter) => {
                      const lessonCount = bundle.lessons.filter(
                        (lesson) => chapterIdForLesson(lesson) === chapter._id,
                      ).length;
                      const testCount = bundle.tests.filter(
                        (test) => test.chapter === chapter._id,
                      ).length;
                      const active = selectedChapter?._id === chapter._id;
                      return (
                        <button
                          key={chapter._id}
                          type="button"
                          onClick={() => {
                            setSelectedChapterId(chapter._id);
                            setExpandedLessonId('');
                            if (activeTab === 'live' && selectedBatchId) {
                              syncUrl({
                                tab: 'live',
                                courseId: selectedCourseId,
                                batchId: selectedBatchId,
                                chapterId: chapter._id,
                              });
                            } else {
                              syncUrl({
                                tab: 'recorded',
                                courseId: selectedCourseId,
                                chapterId: chapter._id,
                              });
                            }
                          }}
                          className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${
                            active
                              ? 'border-l-2 border-l-emerald-700 bg-emerald-50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-sm font-bold text-slate-900">
                            {chapter.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                            {testCount > 0
                              ? ` · ${testCount} ${testCount === 1 ? 'test' : 'tests'}`
                              : ''}
                          </span>
                        </button>
                      );
                    })
                  )}
                </aside>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="font-black text-slate-950">
                      {selectedChapter?.title ?? 'Course content'}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {chapterLessons.length} lessons
                      {chapterTests.length > 0
                        ? ` · ${chapterTests.length} ${chapterTests.length === 1 ? 'test' : 'tests'}`
                        : ''}
                      {' available'}
                    </p>
                  </div>

                  {selectedChapter?.topicDriveUrl ? (
                    <div className="m-4">
                      <ResourceRow
                        icon={Folder}
                        iconBgClass="bg-amber-100"
                        iconTextClass="text-amber-600"
                        title="Topic Notes — Google Drive"
                        subtitle="Reference notes for this topic"
                        primaryActionText="Open Notes"
                        primaryHref={selectedChapter.topicDriveUrl}
                      />
                    </div>
                  ) : null}

                  {chapterLessons.length === 0 && chapterLevelTests.length === 0 ? (
                    <p className="px-5 py-12 text-center text-sm text-slate-500">
                      No lessons are available in this topic.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {chapterLessons.map((lesson, index) => {
                        const expanded = expandedLessonId === lesson._id;
                        const recordedLesson = activeTab === 'recorded';
                        const recordingUrl =
                          lesson.liveClass?.recordingUrl ||
                          lesson.videoUrl ||
                          lesson.video;
                        const hasVideo = Boolean(
                          lesson.youtubeVideoId || recordingUrl,
                        );
                        const lessonTests = chapterTests.filter((test) => test.lesson === lesson._id);
                        const lessonWorksheets =
                          lesson.worksheets?.length
                            ? lesson.worksheets
                            : lesson.worksheet
                              ? [lesson.worksheet]
                              : [];
                        const lessonAssignments = lesson.assignments || [];
                        
                        // For recorded courses, we NEVER show a dropdown.
                        const showDropdown = !recordedLesson;
                        
                        const handlePrimaryAction = () => {
                          if (hasVideo) {
                            setModalLesson(lesson);
                          } else if (lessonWorksheets[0]) {
                            void openWorksheet(lessonWorksheets[0]);
                          } else if (lesson.pdfUrl) {
                            openPdf(`${lesson.title} — Notes`, lesson.pdfUrl);
                          } else if (lessonAssignments[0]) {
                            router.push(`/student/assignments/${lessonAssignments[0]._id}`);
                          } else if (lessonTests.length > 0) {
                            setSelectedTestId(lessonTests[0]._id);
                          }
                        };

                        const hasExtraMaterials =
                          Boolean(lesson.pdfUrl) ||
                          lessonWorksheets.length > 0 ||
                          lessonAssignments.length > 0 ||
                          (lesson.attachments && lesson.attachments.length > 0) ||
                          lessonTests.length > 0;

                        return (
                          <div key={lesson._id}>
                            <div className="flex items-center gap-2 px-5 py-2 transition hover:bg-slate-50">
                              <button
                                type="button"
                                onClick={() => {
                                  if (showDropdown) {
                                    setExpandedLessonId(expanded ? '' : lesson._id);
                                  } else {
                                    handlePrimaryAction();
                                  }
                                }}
                                className={`flex min-w-0 flex-1 items-center gap-3 py-2 text-left ${!showDropdown ? 'cursor-pointer' : ''}`}
                              >
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${
                                    lesson.lessonType === 'live'
                                      ? 'bg-red-500'
                                      : 'bg-emerald-700'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-bold text-slate-950">
                                      {lesson.title}
                                    </span>
                                    {lesson.lessonType === 'live' ? (
                                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase text-red-600">
                                        Live
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-500">
                                    {formatDate(
                                      lesson.liveClass?.scheduledAt ||
                                        lesson.updatedAt,
                                    )}
                                  </span>
                                </span>
                                {showDropdown && (
                                  <ChevronDown
                                    className={`h-4 w-4 text-slate-400 transition ${
                                      expanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                )}
                              </button>
                              {!showDropdown ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handlePrimaryAction}
                                  className="shrink-0 rounded-full bg-emerald-700 hover:bg-emerald-800"
                                >
                                  {hasVideo ? (
                                    <><Play className="mr-1 h-3.5 w-3.5" /> View</>
                                  ) : lesson.pdfUrl || lessonWorksheets.length > 0 ? (
                                    <><FileText className="mr-1 h-3.5 w-3.5" /> View</>
                                  ) : lessonAssignments.length > 0 ? (
                                    <><AssignmentIcon className="mr-1 h-3.5 w-3.5" /> Open</>
                                  ) : lessonTests.length > 0 ? (
                                    <><TestIcon className="mr-1 h-3.5 w-3.5" /> Attempt</>
                                  ) : (
                                    <><Play className="mr-1 h-3.5 w-3.5" /> View</>
                                  )}
                                </Button>
                              ) : null}
                            </div>
                            
                            {/* For Live Courses, show the dropdown content */}
                            {showDropdown && expanded ? (
                              <div className="bg-white px-5 py-4 border-t border-slate-100">
                                {lesson.description ? (
                                  <p className="text-sm leading-6 text-slate-600 mb-3 px-1">
                                    {lesson.description}
                                  </p>
                                ) : null}

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {lesson.liveClass?.meetLink || lesson.lessonType === 'live' ? (
                                    <ResourceCard
                                      icon={Video}
                                      iconBgClass="bg-slate-200"
                                      iconTextClass="text-slate-700"
                                      title="Live Class — Google Meet"
                                      subtitle={lesson.liveClass?.scheduledAt ? `Starts ${formatDate(lesson.liveClass.scheduledAt)}` : 'Scheduled live class'}
                                      primaryActionText={lesson.liveClass?.meetLink ? "Join" : undefined}
                                      primaryHref={lesson.liveClass?.meetLink}
                                    />
                                  ) : null}

                                  {hasVideo ? (
                                    <ResourceCard
                                      icon={Play}
                                      iconBgClass="bg-slate-200"
                                      iconTextClass="text-slate-700"
                                      title={lesson.lessonType === 'live' ? "Class Recording" : "Recorded Class"}
                                      subtitle={lesson.duration ? `${Math.round(lesson.duration / 60)} minutes` : 'Video lesson'}
                                      primaryActionText="View"
                                      onPrimaryAction={() => setModalLesson(lesson)}
                                    />
                                  ) : null}

                                  {/* Prefer worksheets; hide legacy lesson.pdfUrl "Class Notes" when a worksheet exists. */}
                                  {lesson.pdfUrl && lessonWorksheets.length === 0 ? (
                                    <ResourceCard
                                      icon={FileText}
                                      iconBgClass="bg-slate-200"
                                      iconTextClass="text-slate-700"
                                      title="Class Notes"
                                      subtitle="Open lesson document"
                                      primaryActionText="View"
                                      onPrimaryAction={() => openPdf(`${lesson.title} — Notes`, lesson.pdfUrl!)}
                                      secondaryActionText="Download"
                                      secondaryHref={lesson.pdfUrl}
                                    />
                                  ) : null}

                                  {lessonWorksheets.map((worksheet) => (
                                    <ResourceCard
                                      key={worksheet._id}
                                      icon={FileText}
                                      iconBgClass="bg-teal-100"
                                      iconTextClass="text-teal-700"
                                      title={worksheet.title}
                                      badge="Worksheet"
                                      badgeClass="bg-teal-100 text-teal-700"
                                      subtitle="Practice worksheet"
                                      primaryActionText="View"
                                      onPrimaryAction={() => void openWorksheet(worksheet)}
                                      secondaryActionText="Download"
                                      onSecondaryAction={() => void downloadWorksheet(worksheet)}
                                    />
                                  ))}

                                  {lessonAssignments.map((assignment) => (
                                    <ResourceCard
                                      key={assignment._id}
                                      icon={AssignmentIcon}
                                      iconBgClass="bg-orange-100"
                                      iconTextClass="text-orange-700"
                                      title={assignment.title}
                                      badge="Assignment"
                                      badgeClass="bg-orange-100 text-orange-700"
                                      subtitle={
                                        assignment.dueDate
                                          ? `Due ${formatDate(assignment.dueDate)}${assignment.totalMarks ? ` · ${assignment.totalMarks} marks` : ''}`
                                          : assignment.totalMarks
                                            ? `${assignment.totalMarks} marks`
                                            : 'Lesson assignment'
                                      }
                                      primaryActionText="Open"
                                      primaryHref={`/student/assignments/${assignment._id}`}
                                    />
                                  ))}

                                  {(lesson.attachments || []).map((attachment, attachmentIndex) => (
                                    <ResourceCard
                                      key={`${attachment.url}-${attachmentIndex}`}
                                      icon={isPdfAttachment(attachment) ? FileText : Download}
                                      iconBgClass="bg-slate-200"
                                      iconTextClass="text-slate-700"
                                      title={attachment.name}
                                      subtitle={attachment.type || 'Material'}
                                      primaryActionText={isPdfAttachment(attachment) ? "View" : "Download"}
                                      onPrimaryAction={isPdfAttachment(attachment) ? () => openPdf(attachment.name, attachment.url) : undefined}
                                      primaryHref={!isPdfAttachment(attachment) ? attachment.url : undefined}
                                      secondaryActionText={isPdfAttachment(attachment) ? "Download" : undefined}
                                      secondaryHref={isPdfAttachment(attachment) ? attachment.url : undefined}
                                    />
                                  ))}

                                  {lessonTests.map((test) => (
                                    <ResourceCard
                                      key={test._id}
                                      icon={TestIcon}
                                      iconBgClass="bg-purple-100"
                                      iconTextClass="text-purple-700"
                                      title={test.title}
                                      badge="Test"
                                      badgeClass="bg-purple-100 text-purple-700"
                                      subtitle={`${test.questionCount} questions · ${test.totalMarks} marks${test.durationMinutes ? ` · ${test.durationMinutes} minutes` : ''}`}
                                      primaryActionText="Attempt"
                                      onPrimaryAction={() => setSelectedTestId(test._id)}
                                    />
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            
                            {/* For Recorded Courses, show extra materials as cards */}
                            {!showDropdown && hasExtraMaterials ? (
                              <div className="bg-white px-5 pb-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {lesson.pdfUrl &&
                                  hasVideo &&
                                  lessonWorksheets.length === 0 ? (
                                    <ResourceCard
                                      icon={FileText}
                                      iconBgClass="bg-slate-200"
                                      iconTextClass="text-slate-700"
                                      title="Class Notes"
                                      subtitle="Open lesson document"
                                      primaryActionText="View"
                                      onPrimaryAction={() => openPdf(`${lesson.title} — Notes`, lesson.pdfUrl!)}
                                      secondaryActionText="Download"
                                      secondaryHref={lesson.pdfUrl}
                                    />
                                  ) : null}

                                  {lessonWorksheets.map((worksheet) => (
                                    <ResourceCard
                                      key={worksheet._id}
                                      icon={FileText}
                                      iconBgClass="bg-teal-100"
                                      iconTextClass="text-teal-700"
                                      title={worksheet.title}
                                      badge="Worksheet"
                                      badgeClass="bg-teal-100 text-teal-700"
                                      subtitle="Practice worksheet"
                                      primaryActionText="View"
                                      onPrimaryAction={() => void openWorksheet(worksheet)}
                                      secondaryActionText="Download"
                                      onSecondaryAction={() => void downloadWorksheet(worksheet)}
                                    />
                                  ))}

                                  {lessonAssignments.map((assignment) => (
                                    <ResourceCard
                                      key={assignment._id}
                                      icon={AssignmentIcon}
                                      iconBgClass="bg-orange-100"
                                      iconTextClass="text-orange-700"
                                      title={assignment.title}
                                      badge="Assignment"
                                      badgeClass="bg-orange-100 text-orange-700"
                                      subtitle={
                                        assignment.dueDate
                                          ? `Due ${formatDate(assignment.dueDate)}${assignment.totalMarks ? ` · ${assignment.totalMarks} marks` : ''}`
                                          : assignment.totalMarks
                                            ? `${assignment.totalMarks} marks`
                                            : 'Lesson assignment'
                                      }
                                      primaryActionText="Open"
                                      primaryHref={`/student/assignments/${assignment._id}`}
                                    />
                                  ))}

                                  {(lesson.attachments || []).map((attachment, attachmentIndex) => (
                                    <ResourceCard
                                      key={`${attachment.url}-${attachmentIndex}`}
                                      icon={isPdfAttachment(attachment) ? FileText : Download}
                                      iconBgClass="bg-slate-200"
                                      iconTextClass="text-slate-700"
                                      title={attachment.name}
                                      subtitle={attachment.type || 'Material'}
                                      primaryActionText={isPdfAttachment(attachment) ? "View" : "Download"}
                                      onPrimaryAction={isPdfAttachment(attachment) ? () => openPdf(attachment.name, attachment.url) : undefined}
                                      primaryHref={!isPdfAttachment(attachment) ? attachment.url : undefined}
                                      secondaryActionText={isPdfAttachment(attachment) ? "Download" : undefined}
                                      secondaryHref={isPdfAttachment(attachment) ? attachment.url : undefined}
                                    />
                                  ))}

                                  {lessonTests.map((test) => (
                                    <ResourceCard
                                      key={test._id}
                                      icon={TestIcon}
                                      iconBgClass="bg-purple-100"
                                      iconTextClass="text-purple-700"
                                      title={test.title}
                                      badge="Test"
                                      badgeClass="bg-purple-100 text-purple-700"
                                      subtitle={`${test.questionCount} questions · ${test.totalMarks} marks${test.durationMinutes ? ` · ${test.durationMinutes} minutes` : ''}`}
                                      primaryActionText="Attempt"
                                      onPrimaryAction={() => setSelectedTestId(test._id)}
                                    />
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {chapterLevelTests.map((test) => (
                        <ResourceRow
                          key={test._id}
                          icon={TestIcon}
                          iconBgClass="bg-purple-100"
                          iconTextClass="text-purple-700"
                          title={test.title}
                          badge="Test"
                          badgeClass="bg-purple-100 text-purple-700"
                          subtitle={`${test.questionCount} questions · ${test.totalMarks} marks${test.durationMinutes ? ` · ${test.durationMinutes} minutes` : ''}`}
                          primaryActionText="Attempt"
                          onPrimaryAction={() => setSelectedTestId(test._id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                Course content could not be loaded.
              </div>
            )}
          </>
        )}

        <VideoPlayerModal
          open={Boolean(modalLesson)}
          onOpenChange={(open) => {
            if (!open) setModalLesson(null);
          }}
          title={modalLesson?.title || 'Recorded class'}
          youtubeVideoId={modalLesson?.youtubeVideoId}
          videoUrl={
            modalLesson?.liveClass?.recordingUrl ||
            modalLesson?.videoUrl ||
            modalLesson?.video
          }
        />
        <ResourcePdfViewerModal
          open={Boolean(pdfPreview)}
          onOpenChange={(open) => {
            if (!open) setPdfPreview(null);
          }}
          title={pdfPreview?.title || 'Lesson PDF'}
          pdfUrl={pdfPreview?.url || null}
          loading={pdfPreview?.loading || false}
          error={pdfPreview?.error || null}
          downloadHref={pdfPreview?.url || null}
        />
        <StudentPracticeTestModal
          testId={selectedTestId}
          open={Boolean(selectedTestId)}
          onOpenChange={(open) => {
            if (!open) setSelectedTestId(null);
          }}
        />
      </main>
    </StudentRoleShell>
  );
}
