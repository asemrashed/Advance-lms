'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ResourceWorksheetModal } from '@/components/resources/ResourceWorksheetModal';
import AssignmentModal from '@/components/AssignmentModal';
import { PracticeTestModal } from '@/components/exams/PracticeTestModal';
import ConfirmModal from '@/components/ui/confirm-modal';
import { coursesStaffService } from '@/services/coursesStaffService';
import { apiFetch } from '@/lib/api/httpClient';
import {
  batchesService,
  type BatchRecord,
  type LiveClassRecord,
  type RoutineSlotRecord,
} from '@/services/batchesService';
import {
  LessonSchedulePicker,
  nextUpcomingScheduleValue,
  toDatetimeLocalValue,
} from '@/components/courses/LessonSchedulePicker';
import { assignmentsStaffService } from '@/services/assignmentsStaffService';
import { resourceWorksheetsService } from '@/services/resourceWorksheetsService';
import type { Course } from '@/types/course';
import type { Chapter } from '@/types/chapter';
import type { Lesson } from '@/types/lesson';
import type { Assignment } from '@/types/assignment';
import type { ResourceWorksheetRow } from '@/types/resourceWorksheet';
import { cn } from '@/lib/cn';
import { normalizeCourseType } from '@/lib/courses/unifiedCourse';
import { formatGradeLabel } from '@/lib/courseLabel';
import { showSuccess } from '@/lib/swal';
import {
  LuBookOpen,
  LuCalendar,
  LuChevronDown,
  LuChevronUp,
  LuClipboardList,
  LuFileCheck2,
  LuLoader,
  LuPencil,
  LuPlay,
  LuPlus,
  LuSave,
  LuTrash2,
} from 'react-icons/lu';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import { extractYoutubeVideoId } from '@/lib/youtube';

type AttendanceStatus = 'present' | 'absent' | 'late' | null;
type CourseTypeTab = 'live' | 'recorded';
type RosterRow = {
  studentId: string;
  name: string;
  email?: string;
  status: AttendanceStatus;
};

type PracticeTestRow = {
  _id: string;
  title: string;
  description?: string;
  chapter: string | { _id?: string; title?: string };
  lesson?: string | { _id?: string; title?: string } | null;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  status: 'draft' | 'published' | 'archived';
};

function referenceId(value: unknown): string {
  if (value && typeof value === 'object') {
    return String((value as { _id?: unknown })._id || '');
  }
  return String(value || '');
}

function lessonStatus(
  lesson: Lesson,
  liveClass?: LiveClassRecord | null,
): 'done' | 'live' | 'upcoming' | 'none' {
  const iso = liveClass?.scheduledAt;
  if (!iso) return 'none';
  const start = new Date(iso).getTime();
  const durationMs = (liveClass?.durationMinutes || 60) * 60 * 1000;
  const now = Date.now();
  if (start <= now && now < start + durationMs) return 'live';
  if (start + durationMs <= now) return 'done';
  return 'upcoming';
}

function isLiveCourseType(course?: Pick<Course, 'courseType'> | null) {
  return normalizeCourseType(course?.courseType) === 'live';
}

function formatLessonDate(iso?: string) {
  if (!iso) return 'No session date';
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function InstructorMaterialsClient({
  role = 'instructor',
}: {
  role?: 'admin' | 'instructor';
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCourseId = searchParams.get('courseId') || '';
  const urlBatchId = searchParams.get('batchId') || '';
  const urlChapterId = searchParams.get('chapterId') || '';
  const urlTab = searchParams.get('tab') === 'recorded' ? 'recorded' : 'live';
  const isAdmin = role === 'admin';
  const materialsBase = isAdmin ? '/admin/materials' : '/instructor/materials';
  const coursesHref = isAdmin ? '/admin/courses' : '/instructor/courses';
  const coursesCreateHref = `${coursesHref}/create`;
  const courseEditHref = (id: string) => `${coursesHref}/${id}/edit`;
  const RoleShell = isAdmin ? AdminRoleShell : InstructorRoleShell;

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseTypeTab, setCourseTypeTab] = useState<CourseTypeTab>(urlTab);
  const [courseId, setCourseId] = useState(urlCourseId);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchId, setBatchId] = useState(urlBatchId);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterCatalog, setChapterCatalog] = useState<
    Array<{
      name: string;
      order: number;
      chapterId: string | null;
      lessonCount: number;
    }>
  >([]);
  const [pinnedChapterIds, setPinnedChapterIds] = useState<string[]>([]);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [addChapterName, setAddChapterName] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClassRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [worksheets, setWorksheets] = useState<ResourceWorksheetRow[]>([]);
  const [practiceTests, setPracticeTests] = useState<PracticeTestRow[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testToDelete, setTestToDelete] = useState<PracticeTestRow | null>(
    null,
  );
  const [deleteTestLoading, setDeleteTestLoading] = useState(false);

  const [driveUrlDraft, setDriveUrlDraft] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [deleteChapterLoading, setDeleteChapterLoading] = useState(false);
  const [deleteLessonLoading, setDeleteLessonLoading] = useState(false);

  const [meetDraft, setMeetDraft] = useState('');
  const [recordingDraft, setRecordingDraft] = useState('');
  const [publicPreviewDraft, setPublicPreviewDraft] = useState(false);
  const [scheduledDraft, setScheduledDraft] = useState('');
  const [routineSlots, setRoutineSlots] = useState<RoutineSlotRecord[]>([]);
  const [showWorksheetModal, setShowWorksheetModal] = useState(false);
  const [worksheetLessonId, setWorksheetLessonId] = useState('');
  const [editingWorksheet, setEditingWorksheet] =
    useState<ResourceWorksheetRow | null>(null);
  const [worksheetToDelete, setWorksheetToDelete] =
    useState<ResourceWorksheetRow | null>(null);
  const [deleteWorksheetLoading, setDeleteWorksheetLoading] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentLessonId, setAssignmentLessonId] = useState('');
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null,
  );
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<Assignment | null>(null);
  const [deleteAssignmentLoading, setDeleteAssignmentLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testLessonId, setTestLessonId] = useState<string | null>(null);
  const [recordingPreview, setRecordingPreview] = useState<{
    title: string;
    url: string;
  } | null>(null);

  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [attendanceMarks, setAttendanceMarks] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((c) => c._id === courseId),
    [courses, courseId],
  );
  const selectedChapter = useMemo(
    () => chapters.find((c) => c._id === selectedChapterId),
    [chapters, selectedChapterId],
  );
  /** Chapters with lessons, plus any the instructor just added (pinned). */
  const visibleChapters = useMemo(() => {
    const pinned = new Set(pinnedChapterIds);
    return chapters.filter(
      (c) =>
        (c.lessonCount || 0) > 0 ||
        pinned.has(c._id) ||
        c._id === selectedChapterId,
    );
  }, [chapters, pinnedChapterIds, selectedChapterId]);
  /** Subject chapters not yet shown in the Topics list. */
  const availableCatalogChapters = useMemo(() => {
    const visibleIds = new Set(visibleChapters.map((c) => c._id));
    const visibleTitles = new Set(
      visibleChapters.map((c) => c.title.trim().toLowerCase()),
    );
    return chapterCatalog.filter((entry) => {
      if (entry.chapterId && visibleIds.has(entry.chapterId)) return false;
      if (visibleTitles.has(entry.name.trim().toLowerCase())) return false;
      return (entry.lessonCount || 0) === 0;
    });
  }, [chapterCatalog, visibleChapters]);
  const liveCourses = useMemo(
    () => courses.filter((c) => isLiveCourseType(c)),
    [courses],
  );
  const recordedCourses = useMemo(
    () => courses.filter((c) => !isLiveCourseType(c)),
    [courses],
  );
  const visibleCourses =
    courseTypeTab === 'live' ? liveCourses : recordedCourses;
  const isLiveMode =
    courseTypeTab === 'live' && isLiveCourseType(selectedCourse);

  const liveClassById = useMemo(() => {
    const map = new Map<string, LiveClassRecord>();
    for (const row of liveClasses) map.set(row._id, row);
    return map;
  }, [liveClasses]);

  /**
   * Lessons are course-scoped and shared across batches, but live classes are
   * batch-scoped. Prefer the live class that belongs to the selected batch.
   */
  const resolveLiveClassForLesson = useCallback(
    (lesson: Lesson): LiveClassRecord | undefined => {
      if (lesson.liveClassId) {
        const linked = liveClassById.get(lesson.liveClassId);
        if (linked) return linked;
      }
      const title = lesson.title.trim().toLowerCase();
      const chapter = selectedChapterId;
      const byChapterAndTitle = liveClasses.find(
        (row) =>
          row.isActive !== false &&
          row.title.trim().toLowerCase() === title &&
          (!chapter || !row.chapterId || row.chapterId === chapter),
      );
      if (byChapterAndTitle) return byChapterAndTitle;
      return liveClasses.find(
        (row) =>
          row.isActive !== false && row.title.trim().toLowerCase() === title,
      );
    },
    [liveClassById, liveClasses, selectedChapterId],
  );

  const batchMeetLink = useMemo(() => {
    const selected = batches.find((b) => b._id === batchId)?.meetLink?.trim();
    if (selected) return selected;
    return batches.map((b) => b.meetLink?.trim()).find(Boolean) || '';
  }, [batches, batchId]);

  /** Only replace the URL when query values actually change (avoids remount loops). */
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const seededScheduleLessonIdRef = useRef('');

  const syncUrl = useCallback(
    (
      nextCourseId: string,
      nextBatchId: string,
      nextChapterId?: string,
      nextTab?: CourseTypeTab,
    ) => {
      const sp = searchParamsRef.current;
      const currentCourse = sp.get('courseId') || '';
      const currentBatch = sp.get('batchId') || '';
      const currentChapter = sp.get('chapterId') || '';
      const currentTab = sp.get('tab') === 'recorded' ? 'recorded' : 'live';
      const chapterValue = nextChapterId ?? currentChapter;
      const tabValue = nextTab ?? courseTypeTab;
      if (
        nextCourseId === currentCourse &&
        nextBatchId === currentBatch &&
        chapterValue === currentChapter &&
        tabValue === currentTab
      ) {
        return;
      }
      const params = new URLSearchParams();
      params.set('tab', tabValue);
      if (nextCourseId) params.set('courseId', nextCourseId);
      if (nextBatchId) params.set('batchId', nextBatchId);
      if (chapterValue) params.set('chapterId', chapterValue);
      const qs = params.toString();
      const href = qs ? `${materialsBase}?${qs}` : materialsBase;
      router.replace(href, { scroll: false });
    },
    [courseTypeTab, materialsBase, router],
  );

  // Keep React state aligned with the URL (back/forward + deep links).
  useEffect(() => {
    setCourseId((prev) =>
      urlCourseId && urlCourseId !== prev ? urlCourseId : prev,
    );
    // Only adopt a non-empty batch from the URL. Never clear a selected batch
    // just because a racing sync briefly omitted batchId from the query string.
    if (urlBatchId) {
      setBatchId((prev) => (urlBatchId !== prev ? urlBatchId : prev));
    }
    if (urlChapterId) {
      setSelectedChapterId((prev) =>
        urlChapterId !== prev ? urlChapterId : prev,
      );
    }
    const tab = searchParams.get('tab');
    if (tab === 'live' || tab === 'recorded') {
      setCourseTypeTab(tab);
    }
  }, [urlCourseId, urlBatchId, urlChapterId, searchParams]);

  // Initial course list + resolve default course/batch once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await coursesStaffService.listCourses(
          'limit=100&sortBy=updatedAt&sortOrder=desc',
        );
        const data = await res.json();
        if (cancelled) return;
        const rows = (data?.data?.courses as Course[]) || [];
        setCourses(rows);

        let nextCourseId = searchParams.get('courseId') || '';
        let nextBatchId = searchParams.get('batchId') || '';
        let nextTab: CourseTypeTab =
          searchParams.get('tab') === 'recorded' ? 'recorded' : 'live';

        if (!nextCourseId && nextBatchId) {
          const batchRes = await batchesService.getBatch(nextBatchId);
          if (cancelled) return;
          if (batchRes.success && batchRes.data?.batch.courseId) {
            nextCourseId = batchRes.data.batch.courseId;
          }
        }

        const selectedFromUrl = nextCourseId
          ? rows.find((course) => course._id === nextCourseId)
          : undefined;
        if (selectedFromUrl) {
          nextTab = isLiveCourseType(selectedFromUrl) ? 'live' : 'recorded';
        }

        const tabCourses = rows.filter((course) =>
          nextTab === 'live'
            ? isLiveCourseType(course)
            : !isLiveCourseType(course),
        );

        if (
          !nextCourseId ||
          !tabCourses.some((course) => course._id === nextCourseId)
        ) {
          nextCourseId = tabCourses[0]?._id || '';
          nextBatchId = '';
        }

        setCourseTypeTab(nextTab);
        setCourseId(nextCourseId);
        setBatchId(nextBatchId);
        const nextChapterId = searchParams.get('chapterId') || '';
        if (nextChapterId) setSelectedChapterId(nextChapterId);
        syncUrl(nextCourseId, nextBatchId, nextChapterId || undefined, nextTab);
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBatches = useCallback(async (cid: string, preferredBatchId: string) => {
    if (!cid) {
      setBatches([]);
      setBatchesLoading(false);
      return '';
    }
    setBatchesLoading(true);
    try {
      const res = await coursesStaffService.listCourseBatches(cid);
      const data = await res.json();
      const list = Array.isArray(data?.data?.batches)
        ? (data.data.batches as BatchRecord[])
        : [];
      setBatches(list);
      if (!res.ok) {
        setError(data?.error || 'Could not load batches for this course');
      }
      const next =
        preferredBatchId && list.some((b) => b._id === preferredBatchId)
          ? preferredBatchId
          : list[0]?._id || '';
      return next;
    } catch {
      setBatches([]);
      return '';
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  const loadChapters = useCallback(async (cid: string) => {
    if (!cid) {
      setChapters([]);
      setChapterCatalog([]);
      setPinnedChapterIds([]);
      setSelectedChapterId('');
      return;
    }
    try {
      const res = await fetch(
        `/api/chapters?course=${encodeURIComponent(cid)}&limit=200&sortBy=createdAt&sortOrder=asc&includeCatalog=1`,
      );
      const data = await res.json();
      const list = (data?.data?.chapters as Chapter[]) || [];
      const catalog =
        (data?.data?.catalog as Array<{
          name: string;
          order: number;
          chapterId: string | null;
          lessonCount: number;
        }>) || [];
      setChapters(list);
      setChapterCatalog(catalog);
      setPinnedChapterIds((prev) =>
        prev.filter((id) => list.some((c) => c._id === id)),
      );
      setSelectedChapterId((prev) => {
        const fromUrl = (searchParamsRef.current.get('chapterId') || '').trim();
        if (fromUrl && list.some((c) => c._id === fromUrl)) return fromUrl;
        if (prev && list.some((c) => c._id === prev)) return prev;
        const withLessons = list.find((c) => (c.lessonCount || 0) > 0);
        return withLessons?._id || list[0]?._id || '';
      });
    } catch {
      setChapters([]);
      setChapterCatalog([]);
    }
  }, []);

  const loadLessons = useCallback(async (chapterId: string, cid: string) => {
    if (!chapterId || !cid) {
      setLessons([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/lessons?chapter=${encodeURIComponent(chapterId)}&course=${encodeURIComponent(cid)}&limit=200&sortBy=order&sortOrder=asc`,
      );
      const data = await res.json();
      const rows = (data?.data?.lessons as Lesson[]) || [];
      setLessons(rows);
      setChapters((prev) =>
        prev.map((c) =>
          c._id === chapterId ? { ...c, lessonCount: rows.length } : c,
        ),
      );
    } catch {
      setLessons([]);
    }
  }, []);

  const loadLiveClasses = useCallback(async (bid: string) => {
    if (!bid) {
      setLiveClasses([]);
      return;
    }
    const res = await batchesService.listLiveClasses(bid);
    setLiveClasses(res.success && res.data ? res.data.liveClasses : []);
  }, []);

  const loadRoutineSlots = useCallback(async (bid: string) => {
    if (!bid) {
      setRoutineSlots([]);
      return;
    }
    const res = await batchesService.listRoutineSlots(bid);
    setRoutineSlots(res.success && res.data ? res.data.slots : []);
  }, []);

  const loadAssignments = useCallback(async (cid: string) => {
    if (!cid) {
      setAssignments([]);
      return;
    }
    try {
      const res = await assignmentsStaffService.listInstructorAssignments(
        `course=${encodeURIComponent(cid)}&limit=200`,
      );
      const data = await res.json();
      setAssignments((data?.data?.assignments as Assignment[]) || []);
    } catch {
      setAssignments([]);
    }
  }, []);

  const loadWorksheets = useCallback(async (cid: string) => {
    if (!cid) {
      setWorksheets([]);
      return;
    }
    const { res, json } = await resourceWorksheetsService.listStaff(
      `courseId=${encodeURIComponent(cid)}&limit=100`,
    );
    setWorksheets(res.ok ? json.data?.worksheets || [] : []);
  }, []);

  const loadPracticeTests = useCallback(async (cid: string) => {
    if (!cid) {
      setPracticeTests([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/instructor/practice-tests?courseId=${encodeURIComponent(cid)}&limit=200`,
      );
      const data = await res.json();
      setPracticeTests(
        res.ok ? ((data?.data?.tests as PracticeTestRow[]) || []) : [],
      );
    } catch {
      setPracticeTests([]);
    }
  }, []);

  // Load course-scoped data when the selected course changes.
  useEffect(() => {
    if (!courseId) return;
    const course = courses.find((row) => row._id === courseId);
    const knownRecorded = Boolean(course) && !isLiveCourseType(course);
    let cancelled = false;
    void (async () => {
      const preferredBatch =
        searchParamsRef.current.get('batchId') || batchId || '';
      const chapterFromUrl = (
        searchParamsRef.current.get('chapterId') || ''
      ).trim();

      // Fetch batches as soon as we have a courseId. Waiting for the course
      // list used to leave the dropdown stuck on "No batches".
      if (knownRecorded) {
        setBatches([]);
        setBatchId('');
        setLiveClasses([]);
        setRoutineSlots([]);
        await Promise.all([
          loadChapters(courseId),
          loadAssignments(courseId),
          loadWorksheets(courseId),
          loadPracticeTests(courseId),
        ]);
        if (cancelled) return;
        syncUrl(courseId, '', chapterFromUrl || undefined, 'recorded');
        return;
      }

      const [resolvedBatch] = await Promise.all([
        loadBatches(courseId, preferredBatch),
        loadChapters(courseId),
        loadAssignments(courseId),
        loadWorksheets(courseId),
        loadPracticeTests(courseId),
      ]);
      if (cancelled) return;
      const nextBatch = resolvedBatch || '';
      setBatchId((prev) => (prev === nextBatch ? prev : nextBatch));
      syncUrl(
        courseId,
        nextBatch,
        chapterFromUrl || undefined,
        course ? 'live' : courseTypeTab,
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when course identity/type is known
  }, [courseId, courses]);

  // Persist chapter selection in the URL once chapters resolve.
  useEffect(() => {
    if (!courseId || !selectedChapterId) return;
    syncUrl(courseId, batchId, selectedChapterId);
  }, [courseId, batchId, selectedChapterId, syncUrl]);

  useEffect(() => {
    if (batchId && !batchesLoading) {
      void loadLiveClasses(batchId);
      void loadRoutineSlots(batchId);
    }
    if (!batchId) setRoutineSlots([]);
  }, [batchId, batchesLoading, loadLiveClasses, loadRoutineSlots]);

  useEffect(() => {
    if (!expandedLessonId) {
      seededScheduleLessonIdRef.current = '';
      return;
    }
    const lesson = lessons.find((row) => row._id === expandedLessonId);
    const live = lesson ? resolveLiveClassForLesson(lesson) : undefined;
    setMeetDraft((prev) => prev.trim() || live?.meetLink || batchMeetLink);
    if (seededScheduleLessonIdRef.current === expandedLessonId) return;
    if (live?.scheduledAt) {
      setScheduledDraft(toDatetimeLocalValue(new Date(live.scheduledAt)));
      seededScheduleLessonIdRef.current = expandedLessonId;
    }
  }, [expandedLessonId, resolveLiveClassForLesson, batchMeetLink, lessons]);

  useEffect(() => {
    if (!selectedChapterId || !courseId) return;
    void loadLessons(selectedChapterId, courseId);
  }, [selectedChapterId, courseId, loadLessons]);

  // Drive draft follows the selected chapter without re-fetching lessons.
  useEffect(() => {
    const chapter = chapters.find((c) => c._id === selectedChapterId);
    setDriveUrlDraft(chapter?.topicDriveUrl || '');
  }, [selectedChapterId, chapters]);

  const selectCourse = (id: string) => {
    if (id === courseId) return;
    const course = courses.find((row) => row._id === id);
    const tab: CourseTypeTab = isLiveCourseType(course) ? 'live' : 'recorded';
    setCourseTypeTab(tab);
    setCourseId(id);
    setBatchId('');
    setSelectedChapterId('');
    setPinnedChapterIds([]);
    setShowAddChapter(false);
    setAddChapterName('');
    setExpandedLessonId('');
    setLiveClasses([]);
    setRoutineSlots([]);
    syncUrl(id, '', '', tab);
  };

  const selectCourseTypeTab = (tab: CourseTypeTab) => {
    if (tab === courseTypeTab) return;
    setCourseTypeTab(tab);
    const tabCourses = tab === 'live' ? liveCourses : recordedCourses;
    const first = tabCourses[0];
    if (!first) {
      setCourseId('');
      setBatchId('');
      setSelectedChapterId('');
      setLiveClasses([]);
      setRoutineSlots([]);
      syncUrl('', '', '', tab);
      return;
    }
    selectCourse(first._id);
  };

  const selectBatch = (id: string) => {
    if (id === batchId) return;
    setBatchId(id);
    syncUrl(courseId, id, selectedChapterId || undefined);
  };

  const selectChapter = (id: string) => {
    if (id === selectedChapterId) return;
    setSelectedChapterId(id);
    setExpandedLessonId('');
    syncUrl(courseId, batchId, id);
  };

  const lessonAssignment = (lessonId: string) =>
    assignments.find((a) => {
      const lessonRef =
        typeof a.lesson === 'string'
          ? a.lesson
          : a.lesson && typeof a.lesson === 'object'
            ? String((a.lesson as { _id?: string })._id || '')
            : '';
      return lessonRef === lessonId;
    });

  const lessonWorksheet = (lessonId: string) =>
    worksheets.find((w) => w.lessonId === lessonId);

  const chapterTests = practiceTests.filter(
    (test) => referenceId(test.chapter) === selectedChapterId,
  );
  const chapterLevelTests = chapterTests.filter(
    (test) => !referenceId(test.lesson),
  );
  const lessonTests = (lessonId: string) =>
    chapterTests.filter((test) => referenceId(test.lesson) === lessonId);

  const saveDriveUrl = async () => {
    if (!selectedChapterId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/chapters/${selectedChapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicDriveUrl: driveUrlDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to save Drive link');
        return;
      }
      setChapters((prev) =>
        prev.map((c) =>
          c._id === selectedChapterId
            ? { ...c, topicDriveUrl: driveUrlDraft.trim() || undefined }
            : c,
        ),
      );
      setNotice('Topic Drive link saved');
      showSuccess('Saved');
    } catch {
      setError('Failed to save Drive link');
    } finally {
      setSaving(false);
    }
  };

  const addLesson = async () => {
    if (!courseId || !selectedChapterId || !newLessonTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const order = (lessons[lessons.length - 1]?.order || 0) + 1;
      const nextScheduled = nextUpcomingScheduleValue(routineSlots);
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLessonTitle.trim(),
          chapter: selectedChapterId,
          course: courseId,
          lessonType: 'live',
          batchId: batchId || undefined,
          order,
          isPublished: true,
          scheduledAt: nextScheduled
            ? new Date(nextScheduled).toISOString()
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to add lesson');
        return;
      }
      setNewLessonTitle('');
      setChapters((prev) =>
        prev.map((c) =>
          c._id === selectedChapterId
            ? { ...c, lessonCount: (c.lessonCount || 0) + 1 }
            : c,
        ),
      );
      await Promise.all([
        loadLessons(selectedChapterId, courseId),
        batchId ? loadLiveClasses(batchId) : Promise.resolve(),
      ]);
      setExpandedLessonId('');
      setEditingLessonId(null);
      showSuccess('Saved');
    } catch {
      setError('Failed to add lesson');
    } finally {
      setSaving(false);
    }
  };

  const addChapterFromCatalog = async () => {
    if (!courseId || !addChapterName.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: courseId,
          title: addChapterName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to add chapter');
        return;
      }
      const chapter = data?.data as Chapter | undefined;
      if (!chapter?._id) {
        setError('Failed to add chapter');
        return;
      }
      await loadChapters(courseId);
      setPinnedChapterIds((prev) =>
        prev.includes(chapter._id) ? prev : [...prev, chapter._id],
      );
      setSelectedChapterId(chapter._id);
      setAddChapterName('');
      setShowAddChapter(false);
      setNotice(
        data?.meta?.created
          ? `Added “${chapter.title}”. Add a lesson to publish it on the public curriculum.`
          : `Opened “${chapter.title}”. Add a lesson to show it publicly.`,
      );
    } catch {
      setError('Failed to add chapter');
    } finally {
      setSaving(false);
    }
  };

  const saveLessonTitle = async (
    lessonId: string,
    opts?: { skipSavingState?: boolean; title?: string },
  ) => {
    const title = (opts?.title ?? editLessonTitle).trim();
    if (!title) return false;
    if (!opts?.skipSavingState) setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to update lesson');
        return false;
      }
      setEditingLessonId(null);
      await loadLessons(selectedChapterId, courseId);
      return true;
    } catch {
      setError('Failed to update lesson');
      return false;
    } finally {
      if (!opts?.skipSavingState) setSaving(false);
    }
  };

  const saveChapterTitle = async (chapterId: string) => {
    if (!editChapterTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editChapterTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to update chapter');
        return;
      }
      setEditingChapterId(null);
      await loadChapters(courseId);
      setNotice('Chapter updated');
    } catch {
      setError('Failed to update chapter');
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async () => {
    if (!lessonToDelete) return;
    setDeleteLessonLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonToDelete._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to delete lesson');
        return;
      }
      if (expandedLessonId === lessonToDelete._id) setExpandedLessonId('');
      if (editingLessonId === lessonToDelete._id) setEditingLessonId(null);
      setLessonToDelete(null);
      await loadLessons(selectedChapterId, courseId);
      setNotice('Lesson deleted');
    } catch {
      setError('Failed to delete lesson');
    } finally {
      setDeleteLessonLoading(false);
    }
  };

  const deleteChapter = async () => {
    if (!chapterToDelete) return;
    setDeleteChapterLoading(true);
    setError(null);
    try {
      // Remove lessons first — API rejects chapters that still have lessons.
      const chapterLessons =
        chapterToDelete._id === selectedChapterId
          ? lessons
          : (
              await (async () => {
                const res = await fetch(
                  `/api/lessons?chapter=${encodeURIComponent(chapterToDelete._id)}&limit=200`,
                );
                const data = await res.json();
                return (data?.data?.lessons as Lesson[]) || [];
              })()
            );

      for (const lesson of chapterLessons) {
        const res = await fetch(`/api/lessons/${lesson._id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          setError(data?.error || `Failed to delete lesson “${lesson.title}”`);
          return;
        }
      }

      const res = await fetch(`/api/chapters/${chapterToDelete._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to delete chapter');
        return;
      }
      const removedId = chapterToDelete._id;
      setChapterToDelete(null);
      setPinnedChapterIds((prev) => prev.filter((id) => id !== removedId));
      await loadChapters(courseId);
      if (selectedChapterId === removedId) {
        setSelectedChapterId('');
        setLessons([]);
      }
      setNotice('Chapter deleted');
    } catch {
      setError('Failed to delete chapter');
    } finally {
      setDeleteChapterLoading(false);
    }
  };

  const moveLesson = async (lessonId: string, direction: -1 | 1) => {
    const index = lessons.findIndex((l) => l._id === lessonId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= lessons.length) return;
    const reordered = [...lessons];
    const [item] = reordered.splice(index, 1);
    reordered.splice(swapIndex, 0, item);
    const lessonOrders = reordered.map((l, i) => ({
      lessonId: l._id,
      order: i + 1,
    }));
    setSaving(true);
    try {
      const res = await fetch('/api/lessons/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: selectedChapterId, lessonOrders }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || 'Failed to reorder');
        return;
      }
      await loadLessons(selectedChapterId, courseId);
    } catch {
      setError('Failed to reorder lessons');
    } finally {
      setSaving(false);
    }
  };

  const expandedLiveClassId = useMemo(() => {
    if (!expandedLessonId) return '';
    const lesson = lessons.find((l) => l._id === expandedLessonId);
    return lesson ? resolveLiveClassForLesson(lesson)?._id || '' : '';
  }, [expandedLessonId, lessons, resolveLiveClassForLesson]);

  useEffect(() => {
    if (!expandedLessonId || !batchId || !expandedLiveClassId) {
      setRoster([]);
      setAttendanceMarks({});
      setLoadingAttendance(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadingAttendance(true);
      const res = await batchesService.getAttendance(
        batchId,
        expandedLiveClassId,
      );
      if (cancelled) return;
      if (res.success && res.data) {
        setRoster(res.data.roster);
        const marks: Record<string, AttendanceStatus> = {};
        for (const row of res.data.roster) marks[row.studentId] = row.status;
        setAttendanceMarks(marks);
      } else {
        setRoster([]);
        setAttendanceMarks({});
      }
      setLoadingAttendance(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedLessonId, batchId, expandedLiveClassId]);

  const openLessonEditor = (lesson: Lesson) => {
    const live = resolveLiveClassForLesson(lesson);
    setMeetDraft(live?.meetLink || batchMeetLink);
    setRecordingDraft(live?.recordingUrl || '');
    setPublicPreviewDraft(Boolean(lesson.isFree));
    if (live?.scheduledAt) {
      setScheduledDraft(toDatetimeLocalValue(new Date(live.scheduledAt)));
    } else {
      setScheduledDraft(nextUpcomingScheduleValue(routineSlots));
    }
    setExpandedLessonId((prev) => (prev === lesson._id ? '' : lesson._id));
  };

  const saveMeetAndRecording = async (
    lesson: Lesson,
    opts?: { skipSavingState?: boolean },
  ): Promise<string | null> => {
    if (!batchId) {
      setError('Select a batch to manage live session links');
      return null;
    }
    if (!opts?.skipSavingState) setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const scheduledAt = scheduledDraft
        ? new Date(scheduledDraft).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const title =
        editingLessonId === lesson._id && editLessonTitle.trim()
          ? editLessonTitle.trim()
          : lesson.title;
      const meetLink = meetDraft.trim() || batchMeetLink;
      const resolved = resolveLiveClassForLesson(lesson);
      // Only update when the linked live class belongs to the selected batch.
      // Shared curriculum lessons may still point at another batch's session.
      let liveClassId = resolved?._id || '';
      if (liveClassId) {
        const res = await batchesService.updateLiveClass(batchId, liveClassId, {
          title,
          meetLink,
          recordingUrl: recordingDraft.trim(),
          scheduledAt,
          type: recordingDraft.trim() ? 'recorded' : 'live',
        });
        if (!res.success) {
          setError(res.error || 'Failed to update live class');
          return null;
        }
      } else {
        const res = await batchesService.createLiveClass(batchId, {
          title,
          scheduledAt,
          durationMinutes: 60,
          type: recordingDraft.trim() ? 'recorded' : 'live',
          isActive: true,
          meetLink: meetLink || undefined,
          recordingUrl: recordingDraft.trim() || undefined,
          chapterId: selectedChapterId || undefined,
        });
        if (!res.success || !res.data?.liveClass) {
          setError(res.error || 'Failed to create live class');
          return null;
        }
        liveClassId = res.data.liveClass._id;
        // Shared lessons may already point at another batch's session — don't overwrite.
        if (!lesson.liveClassId) {
          const lessonRes = await fetch(`/api/lessons/${lesson._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lessonType: 'live',
              liveClassId,
            }),
          });
          if (!lessonRes.ok) {
            const data = await lessonRes.json();
            setError(data?.error || 'Failed to link live class to lesson');
            return null;
          }
        }
      }
      await Promise.all([
        loadLiveClasses(batchId),
        loadLessons(selectedChapterId, courseId),
      ]);
      return liveClassId;
    } catch {
      setError('Failed to save session links');
      return null;
    } finally {
      if (!opts?.skipSavingState) setSaving(false);
    }
  };

  /** Clear legacy lesson.pdfUrl so students only see the worksheet card. */
  const clearLegacyLessonPdf = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: '' }),
      });
      if (res.ok) {
        await loadLessons(selectedChapterId, courseId);
      }
    } catch {
      // non-blocking cleanup
    }
  };

  const saveAttendance = async (
    lesson: Lesson,
    opts?: { skipSavingState?: boolean },
  ) => {
    if (!batchId || !lesson.liveClassId) return true;
    if (!opts?.skipSavingState) setSaving(true);
    setError(null);
    try {
      const marks = Object.entries(attendanceMarks)
        .filter(
          ([, status]) =>
            status === 'present' || status === 'absent' || status === 'late',
        )
        .map(([studentId, status]) => ({
          studentId,
          status: status as 'present' | 'absent' | 'late',
        }));
      const res = await batchesService.saveAttendance(
        batchId,
        lesson.liveClassId,
        marks,
      );
      if (!res.success) {
        setError(res.error || 'Failed to save attendance');
        return false;
      }
      return true;
    } catch {
      setError('Failed to save attendance');
      return false;
    } finally {
      if (!opts?.skipSavingState) setSaving(false);
    }
  };

  const saveLesson = async (lesson: Lesson) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editingLessonId === lesson._id && editLessonTitle.trim()) {
        const titleOk = await saveLessonTitle(lesson._id, {
          skipSavingState: true,
        });
        if (!titleOk) return;
      }

      let liveClassId = lesson.liveClassId || '';
      if (batchId) {
        const sessionId = await saveMeetAndRecording(lesson, {
          skipSavingState: true,
        });
        if (!sessionId) return;
        liveClassId = sessionId;
      }

      const hasRecordingSource = Boolean(
        recordingDraft.trim() ||
          lesson.youtubeVideoId ||
          lesson.videoUrl,
      );
      const nextIsFree = hasRecordingSource ? publicPreviewDraft : false;
      if (nextIsFree !== Boolean(lesson.isFree)) {
        const freeRes = await fetch(`/api/lessons/${lesson._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFree: nextIsFree }),
        });
        if (!freeRes.ok) {
          const data = await freeRes.json().catch(() => null);
          setError(data?.error || 'Failed to save public preview setting');
          return;
        }
      }

      if (batchId && liveClassId && roster.length > 0) {
        const attendanceOk = await saveAttendance(
          { ...lesson, liveClassId },
          { skipSavingState: true },
        );
        if (!attendanceOk) return;
      }

      await loadLessons(selectedChapterId, courseId);
      setExpandedLessonId('');
      setEditingLessonId(null);
      showSuccess('Saved');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    for (const row of roster) next[row.studentId] = 'present';
    setAttendanceMarks(next);
  };

  const deletePracticeTest = async () => {
    if (!testToDelete) return;
    setDeleteTestLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/instructor/practice-tests/${encodeURIComponent(testToDelete._id)}`,
        { method: 'DELETE' },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete test');
        return;
      }
      setPracticeTests((tests) =>
        tests.filter((test) => test._id !== testToDelete._id),
      );
      setNotice(`Deleted "${testToDelete.title}"`);
      setTestToDelete(null);
    } catch {
      setError('Failed to delete test');
    } finally {
      setDeleteTestLoading(false);
    }
  };

  const deleteWorksheet = async () => {
    if (!worksheetToDelete) return;
    setDeleteWorksheetLoading(true);
    setError(null);
    try {
      const { res, json } = await resourceWorksheetsService.deleteWorksheet(
        worksheetToDelete._id,
      );
      if (!res.ok) {
        setError(json.error || 'Failed to delete worksheet');
        return;
      }
      setWorksheets((rows) =>
        rows.filter((row) => row._id !== worksheetToDelete._id),
      );
      setNotice(`Deleted worksheet "${worksheetToDelete.title}"`);
      setWorksheetToDelete(null);
    } catch {
      setError('Failed to delete worksheet');
    } finally {
      setDeleteWorksheetLoading(false);
    }
  };

  const deleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setDeleteAssignmentLoading(true);
    setError(null);
    try {
      const response = await assignmentsStaffService.deleteAssignment(
        assignmentToDelete._id,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Failed to delete assignment');
        return;
      }
      setAssignments((rows) =>
        rows.filter((row) => row._id !== assignmentToDelete._id),
      );
      setNotice(`Deleted assignment "${assignmentToDelete.title}"`);
      setAssignmentToDelete(null);
    } catch {
      setError('Failed to delete assignment');
    } finally {
      setDeleteAssignmentLoading(false);
    }
  };

  const topicProgress = (chapterId: string) => {
    // Approximate from selected chapter lessons only when matching.
    if (chapterId !== selectedChapterId) {
      return { pct: 0, label: 'Open to view', done: 0, total: 0 };
    }
    const total = lessons.length;
    if (total === 0) return { pct: 0, label: 'Not started', done: 0, total: 0 };
    const done = lessons.filter((l) => {
      const live = resolveLiveClassForLesson(l);
      return lessonStatus(l, live) === 'done';
    }).length;
    const pct = Math.round((done / total) * 100);
    if (done === 0) return { pct, label: 'Not started', done, total };
    if (done === total) return { pct, label: 'Complete', done, total };
    return { pct, label: `In progress · ${done}/${total} done`, done, total };
  };

  return (
    <RoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="Curriculum Builder"
          subtitle={
            selectedCourse
              ? `${selectedCourse.title}${
                  isLiveMode && batches.find((b) => b._id === batchId)
                    ? ` · ${batches.find((b) => b._id === batchId)?.name}`
                    : ''
                }`
              : 'Build topics and lessons with materials, Meet links, and attendance'
          }
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={courseTypeTab === 'live' ? 'default' : 'outline'}
              onClick={() => selectCourseTypeTab('live')}
              className="gap-2 rounded-full data-[variant=default]:bg-emerald-700"
            >
              <LuCalendar className="h-4 w-4" />
              Live
            </Button>
            <Button
              type="button"
              size="sm"
              variant={courseTypeTab === 'recorded' ? 'default' : 'outline'}
              onClick={() => selectCourseTypeTab('recorded')}
              className="gap-2 rounded-full data-[variant=default]:bg-emerald-700"
            >
              <LuBookOpen className="h-4 w-4" />
              Recorded
            </Button>
          </div>
          {courseId ? (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={courseEditHref(courseId)}>Edit course</Link>
            </Button>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          {loading ? (
            <LuLoader className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : visibleCourses.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              No {courseTypeTab} courses.{' '}
              <Link
                href={coursesCreateHref}
                className="text-primary hover:underline"
              >
                Create one
              </Link>
            </span>
          ) : (
            visibleCourses.map((course) => (
              <button
                key={course._id}
                type="button"
                onClick={() => selectCourse(course._id)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                  courseId === course._id
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300',
                )}
              >
                {course.title}
                {course.grade ? (
                  <span className="ml-1 font-medium text-slate-500">
                    · {formatGradeLabel(course.grade)}
                  </span>
                ) : null}
              </button>
            ))
          )}
          {courseTypeTab === 'live' ? (
            <select
              className="ml-auto h-9 min-w-[180px] rounded-lg border border-primary/20 bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              value={batchId}
              onChange={(e) => selectBatch(e.target.value)}
              disabled={batchesLoading || batches.length === 0}
            >
              {batchesLoading ? (
                <option value="">Loading batches…</option>
              ) : batches.length === 0 ? (
                <option value="">No batches — add in Edit course</option>
              ) : (
                batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))
              )}
            </select>
          ) : null}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {notice}
          </p>
        )}

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm xl:sticky xl:top-20 xl:self-start">
            <div className="flex items-center gap-2 border-b border-primary/15 bg-primary px-4 py-3 text-primary-foreground">
              <LuBookOpen className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Topics</h3>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="ml-auto h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15"
                title="Create chapter test"
                aria-label="Create chapter test"
                disabled={!courseId || !selectedChapterId}
                onClick={() => {
                  setTestLessonId(null);
                  setShowTestModal(true);
                }}
              >
                <LuFileCheck2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {visibleChapters.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No topics yet. Add a chapter from the subject catalog, then
                  add lessons.
                </p>
              ) : (
                visibleChapters.map((chapter) => {
                  const progress = topicProgress(chapter._id);
                  const active = chapter._id === selectedChapterId;
                  const lessonCount =
                    chapter._id === selectedChapterId
                      ? lessons.length
                      : chapter.lessonCount || 0;
                  const isEditing = editingChapterId === chapter._id;
                  return (
                    <div
                      key={chapter._id}
                      className={cn(
                        'border-b border-border last:border-0',
                        active ? 'bg-primary/10' : 'bg-card',
                      )}
                    >
                      {isEditing ? (
                        <div className="space-y-2 px-4 py-3">
                          <Input
                            className="h-8"
                            value={editChapterTitle}
                            onChange={(e) => setEditChapterTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="flex-1"
                              disabled={saving || !editChapterTitle.trim()}
                              onClick={() => void saveChapterTitle(chapter._id)}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => setEditingChapterId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-stretch gap-1">
                          <button
                            type="button"
                            onClick={() => selectChapter(chapter._id)}
                            className={cn(
                              'min-w-0 flex-1 px-4 py-3 text-left transition-colors',
                              active ? '' : 'hover:bg-primary/5',
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-sm font-semibold">
                                {chapter.title}
                              </div>
                              <div className="shrink-0 text-[11px] text-muted-foreground">
                                {lessonCount} lessons
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${progress.pct}%` }}
                              />
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {progress.label}
                            </div>
                          </button>
                          <div className="flex flex-col justify-center gap-0.5 py-2 pr-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Edit chapter"
                              aria-label="Edit chapter"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectChapter(chapter._id);
                                setEditingChapterId(chapter._id);
                                setEditChapterTitle(chapter.title);
                              }}
                            >
                              <LuPencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete chapter"
                              aria-label="Delete chapter"
                              onClick={(e) => {
                                e.stopPropagation();
                                setChapterToDelete(chapter);
                              }}
                            >
                              <LuTrash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-border bg-muted/30 p-3">
              {showAddChapter ? (
                <div className="space-y-2">
                  <Label
                    htmlFor="add-chapter-select"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Select chapter
                  </Label>
                  <select
                    id="add-chapter-select"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={addChapterName}
                    onChange={(e) => setAddChapterName(e.target.value)}
                    disabled={saving || !courseId}
                  >
                    <option value="">Choose from subject…</option>
                    {availableCatalogChapters.map((entry) => (
                      <option key={`${entry.order}-${entry.name}`} value={entry.name}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                  {availableCatalogChapters.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {chapterCatalog.length === 0
                        ? 'No subject chapters found. Ask an admin to add chapters on the subject.'
                        : 'All subject chapters are already in this curriculum.'}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      disabled={
                        saving || !addChapterName.trim() || !courseId
                      }
                      onClick={() => void addChapterFromCatalog()}
                    >
                      <LuPlus className="mr-1 h-3.5 w-3.5" />
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setShowAddChapter(false);
                        setAddChapterName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!courseId}
                  onClick={() => setShowAddChapter(true)}
                >
                  <LuPlus className="mr-1 h-4 w-4" />
                  Add Chapter
                </Button>
              )}
            </div>
          </aside>

          <div className="space-y-4">
            {!selectedChapter ? (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                Select a topic to manage lessons
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">
                      {selectedChapter.title} — Lessons
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {lessons.length} lessons under this topic
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={saving}
                      onClick={() => {
                        setEditingChapterId(selectedChapter._id);
                        setEditChapterTitle(selectedChapter.title);
                      }}
                    >
                      <LuPencil className="h-3.5 w-3.5" />
                      Edit chapter
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={saving}
                      onClick={() => setChapterToDelete(selectedChapter)}
                    >
                      <LuTrash2 className="h-3.5 w-3.5" />
                      Delete chapter
                    </Button>
                    <Input
                      className="w-[220px]"
                      placeholder="New lesson title"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                    />
                    <Button
                      disabled={saving || !newLessonTitle.trim()}
                      onClick={() => void addLesson()}
                    >
                      <LuPlus className="mr-1 h-4 w-4" />
                      Add Lesson
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                      title="Create chapter test"
                      aria-label="Create chapter test"
                      disabled={!courseId || !selectedChapterId}
                      onClick={() => {
                        setTestLessonId(null);
                        setShowTestModal(true);
                      }}
                    >
                      <LuFileCheck2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Topic Notes — Google Drive Link
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="url"
                      className="min-w-[240px] flex-1"
                      placeholder="Paste Google Drive folder or file link..."
                      value={driveUrlDraft}
                      onChange={(e) => setDriveUrlDraft(e.target.value)}
                    />
                    {driveUrlDraft.trim() ? (
                      <Button variant="outline" asChild>
                        <a
                          href={driveUrlDraft.trim()}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      disabled={saving}
                      onClick={() => void saveDriveUrl()}
                    >
                      <LuSave className="mr-1 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                  {selectedChapter.topicDriveUrl ? (
                    <p className="mt-2 text-xs text-emerald-700">
                      Saved · visible to enrolled students for this topic
                    </p>
                  ) : null}
                </div>

                {chapterLevelTests.length > 0 ? (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <LuFileCheck2 className="h-4 w-4 text-purple-700" />
                      <h3 className="text-sm font-semibold text-purple-950">
                        Chapter tests
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {chapterLevelTests.map((test) => (
                        <div
                          key={test._id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-200 bg-white px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{test.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {test.questionCount} questions · {test.totalMarks} marks
                              · {test.durationMinutes} minutes
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span
                              className={cn(
                                'mr-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                                test.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {test.status}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              title="Edit test"
                              aria-label={`Edit ${test.title}`}
                              asChild
                            >
                              <Link href={isAdmin ? `/admin/assignments?courseId=${courseId}` : `/instructor/tests?id=${test._id}`}>
                                <LuPencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              title="Delete test"
                              aria-label={`Delete ${test.title}`}
                              onClick={() => setTestToDelete(test)}
                            >
                              <LuTrash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {lessons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                    No lessons yet. Add the first lesson for this topic.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => {
                      const live = resolveLiveClassForLesson(lesson);
                      const status = lessonStatus(lesson, live);
                      const assignment = lessonAssignment(lesson._id);
                      const worksheet = lessonWorksheet(lesson._id);
                      const hasMeet = Boolean(live?.meetLink || batchMeetLink);
                      const hasPdf = Boolean(lesson.pdfUrl || worksheet?.pdfUrl);
                      const hasAssignment = Boolean(assignment);
                      const hasRecording = Boolean(live?.recordingUrl);
                      const tests = lessonTests(lesson._id);
                      const hasTest = tests.length > 0;
                      const expanded = expandedLessonId === lesson._id;
                      const submitted = Number(
                        (assignment as Assignment & { submissionCount?: number })
                          ?.submissionCount || 0,
                      );

                      return (
                        <div
                          key={lesson._id}
                          className="overflow-hidden rounded-2xl border border-border bg-card"
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
                            onClick={() => openLessonEditor(lesson)}
                          >
                            <div
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                status === 'live' &&
                                  'bg-red-500 text-white',
                                status === 'upcoming' &&
                                  'bg-amber-100 text-amber-800',
                                status === 'done' &&
                                  'bg-emerald-100 text-emerald-800',
                                status === 'none' &&
                                  'bg-muted text-muted-foreground',
                              )}
                            >
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-semibold">
                                  {lesson.title}
                                </span>
                                {status === 'live' ? (
                                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                                    Live Today
                                  </span>
                                ) : null}
                                {status === 'upcoming' ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                                    Upcoming
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatLessonDate(live?.scheduledAt)}
                                {status === 'done' ? ' · Complete' : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <span className={hasMeet ? 'opacity-100' : 'opacity-30'}>
                                🔗
                              </span>
                              <span className={hasPdf ? 'opacity-100' : 'opacity-30'}>
                                📄
                              </span>
                              <span
                                className={
                                  hasAssignment ? 'opacity-100' : 'opacity-30'
                                }
                              >
                                📝
                              </span>
                              <span
                                className={
                                  hasRecording ? 'opacity-100' : 'opacity-30'
                                }
                              >
                                🎬
                              </span>
                              <span className={hasTest ? 'opacity-100' : 'opacity-30'}>
                                ✅
                              </span>
                            </div>
                            {expanded ? (
                              <LuChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <LuChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>

                          {expanded ? (
                            <div className="space-y-4 border-t border-border bg-muted/10 p-4">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={saving || index === 0}
                                  onClick={() => void moveLesson(lesson._id, -1)}
                                >
                                  Move up
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    saving || index === lessons.length - 1
                                  }
                                  onClick={() => void moveLesson(lesson._id, 1)}
                                >
                                  Move down
                                </Button>
                                {editingLessonId === lesson._id ? (
                                  <Input
                                    className="h-8 w-[200px]"
                                    value={editLessonTitle}
                                    onChange={(e) =>
                                      setEditLessonTitle(e.target.value)
                                    }
                                  />
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingLessonId(lesson._id);
                                      setEditLessonTitle(lesson.title);
                                    }}
                                  >
                                    <LuPencil className="mr-1 h-3.5 w-3.5" />
                                    Edit title
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={saving}
                                  onClick={() => setLessonToDelete(lesson)}
                                >
                                  <LuTrash2 className="mr-1 h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-xl border border-border bg-card p-3">
                                  <Label className="text-xs">Google Meet Link</Label>
                                  <Input
                                    className="mt-1"
                                    type="url"
                                    placeholder="https://meet.google.com/..."
                                    value={meetDraft}
                                    onChange={(e) => setMeetDraft(e.target.value)}
                                  />
                                  {batchMeetLink ? (
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                      Uses the permanent course Meet link unless you
                                      enter a different one.
                                    </p>
                                  ) : null}
                                  <LessonSchedulePicker
                                    key={`${lesson._id}-${routineSlots.length ? 'ready' : 'empty'}`}
                                    value={scheduledDraft}
                                    onChange={setScheduledDraft}
                                    slots={routineSlots}
                                  />
                                  <div className="mt-2 flex gap-2">
                                    {meetDraft.trim() ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          void navigator.clipboard.writeText(
                                            meetDraft.trim(),
                                          )
                                        }
                                      >
                                        Copy
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-border bg-card p-3">
                                  <Label className="text-xs">Class Recording</Label>
                                  <Input
                                    className="mt-1"
                                    type="url"
                                    placeholder="YouTube / Drive recording URL"
                                    value={recordingDraft}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setRecordingDraft(value);
                                      if (!value.trim()) {
                                        setPublicPreviewDraft(false);
                                      }
                                    }}
                                  />
                                  <div className="mt-3 flex items-start gap-2">
                                    <Checkbox
                                      id={`public-preview-${lesson._id}`}
                                      checked={publicPreviewDraft}
                                      disabled={!recordingDraft.trim()}
                                      onCheckedChange={(checked) =>
                                        setPublicPreviewDraft(checked === true)
                                      }
                                    />
                                    <div className="min-w-0">
                                      <Label
                                        htmlFor={`public-preview-${lesson._id}`}
                                        className="cursor-pointer text-xs font-medium leading-snug"
                                      >
                                        Allow public preview
                                      </Label>
                                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                        Non-logged-in visitors can watch this
                                        recording from the public course page.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(recordingDraft.trim() ||
                                      live?.recordingUrl) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const url =
                                            recordingDraft.trim() ||
                                            live?.recordingUrl ||
                                            '';
                                          if (!url) return;
                                          setRecordingPreview({
                                            title: lesson.title,
                                            url,
                                          });
                                        }}
                                      >
                                        <LuPlay className="mr-1 h-3.5 w-3.5" />
                                        Watch
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-border bg-card p-3">
                                  <div className="mb-2 text-xs font-semibold">
                                    Worksheet
                                  </div>
                                  {worksheet ? (
                                    <>
                                      <p className="text-sm font-medium">
                                        {worksheet.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {worksheet.sourceType === 'course_qb'
                                          ? `From question bank · ${worksheet.questionIds?.length ?? 0} question(s)`
                                          : 'Uploaded PDF'}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingWorksheet(worksheet);
                                            setWorksheetLessonId(lesson._id);
                                            setShowWorksheetModal(true);
                                          }}
                                        >
                                          Edit worksheet
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() =>
                                            setWorksheetToDelete(worksheet)
                                          }
                                        >
                                          <LuTrash2 className="mr-1 h-3.5 w-3.5" />
                                          Delete
                                        </Button>
                                      </div>
                                      {worksheet.pdfUrl ? (
                                        <a
                                          href={worksheet.pdfUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-2 block text-xs text-primary hover:underline"
                                        >
                                          Open worksheet PDF
                                        </a>
                                      ) : null}
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingWorksheet(null);
                                        setWorksheetLessonId(lesson._id);
                                        setShowWorksheetModal(true);
                                      }}
                                    >
                                      Build worksheet
                                    </Button>
                                  )}
                                  {lesson.pdfUrl ? (
                                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                                      <p>
                                        A legacy Class Notes PDF is still attached
                                        to this lesson. Students may see it as
                                        notes.
                                      </p>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="mt-1 h-7 px-2 text-amber-900 dark:text-amber-100"
                                        onClick={() =>
                                          void clearLegacyLessonPdf(lesson._id)
                                        }
                                      >
                                        Remove legacy notes PDF
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="rounded-xl border border-border bg-card p-3">
                                  <div className="mb-2 text-xs font-semibold">
                                    Assignment
                                  </div>
                                  {assignment ? (
                                    <>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium">
                                            {assignment.title}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {submitted} submissions tracked
                                          </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            title="Edit assignment"
                                            aria-label={`Edit ${assignment.title}`}
                                            onClick={() => {
                                              setEditingAssignment(assignment);
                                              setAssignmentLessonId(lesson._id);
                                              setShowAssignmentModal(true);
                                            }}
                                          >
                                            <LuPencil className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                            title="Delete assignment"
                                            aria-label={`Delete ${assignment.title}`}
                                            onClick={() =>
                                              setAssignmentToDelete(assignment)
                                            }
                                          >
                                            <LuTrash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                      <Button
                                        className="mt-2"
                                        size="sm"
                                        asChild
                                      >
                                        <Link
                                          href={
                                            isAdmin
                                              ? `/admin/assignments/${assignment._id}/submissions`
                                              : `/instructor/assignments/${assignment._id}/submissions`
                                          }
                                        >
                                          View all submissions →
                                        </Link>
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-xs text-muted-foreground">
                                        Create an assignment scoped to this lesson.
                                      </p>
                                      <Button
                                        className="mt-2"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingAssignment(null);
                                          setAssignmentLessonId(lesson._id);
                                          setShowAssignmentModal(true);
                                        }}
                                      >
                                        <LuClipboardList className="mr-1 h-3.5 w-3.5" />
                                        Create assignment
                                      </Button>
                                    </>
                                  )}
                                </div>

                                <div className="rounded-xl border border-border bg-card p-3">
                                  <div className="mb-2 text-xs font-semibold">
                                    Test
                                  </div>
                                  {tests.length > 0 ? (
                                    <div className="space-y-3">
                                      {tests.map((test) => (
                                        <div key={test._id}>
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium">
                                                  {test.title}
                                                </p>
                                                <span
                                                  className={cn(
                                                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                                                    test.status === 'published'
                                                      ? 'bg-emerald-100 text-emerald-700'
                                                      : 'bg-muted text-muted-foreground',
                                                  )}
                                                >
                                                  {test.status}
                                                </span>
                                              </div>
                                              <p className="mt-1 text-xs text-muted-foreground">
                                                {test.questionCount} questions ·{' '}
                                                {test.totalMarks} marks ·{' '}
                                                {test.durationMinutes} minutes
                                              </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                title="Edit test"
                                                aria-label={`Edit ${test.title}`}
                                                asChild
                                              >
                                                <Link
                                                  href={
                                                    isAdmin
                                                      ? `/admin/assignments?courseId=${courseId}`
                                                      : `/instructor/tests?id=${test._id}`
                                                  }
                                                >
                                                  <LuPencil className="h-3.5 w-3.5" />
                                                </Link>
                                              </Button>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                title="Delete test"
                                                aria-label={`Delete ${test.title}`}
                                                onClick={() =>
                                                  setTestToDelete(test)
                                                }
                                              >
                                                <LuTrash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-xs text-muted-foreground">
                                        Create a test scoped to this lesson.
                                      </p>
                                      <Button
                                        className="mt-2"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setTestLessonId(lesson._id);
                                          setShowTestModal(true);
                                        }}
                                      >
                                        <LuFileCheck2 className="mr-1 h-3.5 w-3.5" />
                                        Create test
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {assignment ? (
                                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4">
                                  <div className="text-center">
                                    <div className="text-lg font-bold">
                                      {roster.length || '—'}
                                    </div>
                                    <div className="text-[10px] uppercase text-muted-foreground">
                                      Enrolled
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold">
                                      {submitted}
                                    </div>
                                    <div className="text-[10px] uppercase text-muted-foreground">
                                      Submitted
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold">
                                      {roster.length
                                        ? Math.max(0, roster.length - submitted)
                                        : '—'}
                                    </div>
                                    <div className="text-[10px] uppercase text-muted-foreground">
                                      Missing
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold">—</div>
                                    <div className="text-[10px] uppercase text-muted-foreground">
                                      Reviewed
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              <div className="rounded-xl border border-border bg-card p-3">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <h4 className="text-sm font-semibold">
                                    Attendance
                                    {roster.length
                                      ? ` — ${roster.length} students`
                                      : ''}
                                  </h4>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!roster.length}
                                    onClick={markAllPresent}
                                  >
                                    Mark All Present
                                  </Button>
                                </div>
                                {!batchId ? (
                                  <p className="text-xs text-muted-foreground">
                                    Select a batch to take attendance.
                                  </p>
                                ) : !lesson.liveClassId ? (
                                  <p className="text-xs text-muted-foreground">
                                    Save the lesson with a Meet session first to
                                    unlock the attendance roster.
                                  </p>
                                ) : loadingAttendance ? (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <LuLoader className="h-4 w-4 animate-spin" />
                                    Loading roster…
                                  </div>
                                ) : roster.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    No enrolled students in this batch yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {roster.map((row) => {
                                      const mark =
                                        attendanceMarks[row.studentId] ?? null;
                                      return (
                                        <div
                                          key={row.studentId}
                                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                              {(row.name || '?')
                                                .charAt(0)
                                                .toUpperCase()}
                                            </div>
                                            <div className="text-sm font-medium">
                                              {row.name}
                                            </div>
                                          </div>
                                          <div className="flex gap-1">
                                            {(
                                              [
                                                'present',
                                                'late',
                                                'absent',
                                              ] as const
                                            ).map((status) => (
                                              <button
                                                key={status}
                                                type="button"
                                                onClick={() =>
                                                  setAttendanceMarks((prev) => ({
                                                    ...prev,
                                                    [row.studentId]: status,
                                                  }))
                                                }
                                                className={cn(
                                                  'rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize',
                                                  mark === status
                                                    ? status === 'present'
                                                      ? 'bg-emerald-100 text-emerald-800'
                                                      : status === 'late'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-red-100 text-red-700'
                                                    : 'bg-muted text-muted-foreground',
                                                )}
                                              >
                                                {status}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end border-t border-border pt-3">
                                <Button
                                  disabled={saving}
                                  onClick={() => void saveLesson(lesson)}
                                >
                                  {saving ? (
                                    <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <LuSave className="mr-2 h-4 w-4" />
                                  )}
                                  Save lesson
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </InstructorPage>

      {courseId && selectedChapterId && worksheetLessonId ? (
        <ResourceWorksheetModal
          open={showWorksheetModal}
          worksheet={editingWorksheet}
          onClose={() => {
            setShowWorksheetModal(false);
            setEditingWorksheet(null);
            setWorksheetLessonId('');
          }}
          onSuccess={() => {
            const lessonId = worksheetLessonId;
            setShowWorksheetModal(false);
            setEditingWorksheet(null);
            setWorksheetLessonId('');
            void loadWorksheets(courseId);
            if (lessonId) void clearLegacyLessonPdf(lessonId);
            showSuccess('Saved');
          }}
          role={role}
          courseScoped
          lockedCourse={{
            courseId,
            courseKind: 'live',
            subjectName: selectedCourse?.subjectName || selectedCourse?.category,
            grade: selectedCourse?.grade,
            chapterId: selectedChapterId,
            chapterTitle: selectedChapter?.title,
            lessonId: worksheetLessonId,
          }}
        />
      ) : null}

      {courseId && selectedChapterId && assignmentLessonId ? (
        <AssignmentModal
          open={showAssignmentModal}
          assignment={editingAssignment}
          role={role}
          courseScoped
          lockedCourse={{
            courseId,
            chapterId: selectedChapterId,
            chapterTitle: selectedChapter?.title,
            lessonId: assignmentLessonId,
            subjectName: selectedCourse?.subjectName || selectedCourse?.category,
          }}
          onClose={() => {
            setShowAssignmentModal(false);
            setAssignmentLessonId('');
            setEditingAssignment(null);
          }}
          onSuccess={() => {
            setShowAssignmentModal(false);
            setAssignmentLessonId('');
            setEditingAssignment(null);
            void loadAssignments(courseId);
            showSuccess('Saved');
          }}
        />
      ) : null}

      {courseId && selectedChapterId && showTestModal ? (
        <PracticeTestModal
          open={showTestModal}
          onClose={() => {
            setShowTestModal(false);
            setTestLessonId(null);
          }}
          onSuccess={() => {
            void loadPracticeTests(courseId);
            showSuccess('Saved');
          }}
          locked={{
            courseId,
            chapterId: selectedChapterId,
            lessonId: testLessonId || undefined,
            subjectName: selectedCourse?.subjectName || selectedCourse?.category,
            chapterTitle: selectedChapter?.title,
            lessonTitle: testLessonId
              ? lessons.find((l) => l._id === testLessonId)?.title
              : undefined,
          }}
        />
      ) : null}

      <VideoPlayerModal
        open={Boolean(recordingPreview)}
        onOpenChange={(open) => {
          if (!open) setRecordingPreview(null);
        }}
        title={recordingPreview?.title || 'Class recording'}
        youtubeVideoId={
          recordingPreview
            ? extractYoutubeVideoId(recordingPreview.url)
            : undefined
        }
        videoUrl={recordingPreview?.url}
      />

      <ConfirmModal
        open={Boolean(testToDelete)}
        onClose={() => setTestToDelete(null)}
        onConfirm={() => void deletePracticeTest()}
        title="Delete test"
        description={`Are you sure you want to delete "${testToDelete?.title || 'this test'}"? This action cannot be undone.`}
        confirmText="Delete test"
        variant="danger"
        loading={deleteTestLoading}
      />

      <ConfirmModal
        open={Boolean(worksheetToDelete)}
        onClose={() => setWorksheetToDelete(null)}
        onConfirm={() => void deleteWorksheet()}
        title="Delete worksheet"
        description={`Are you sure you want to delete "${worksheetToDelete?.title || 'this worksheet'}"? This action cannot be undone.`}
        confirmText="Delete worksheet"
        variant="danger"
        loading={deleteWorksheetLoading}
      />

      <ConfirmModal
        open={Boolean(assignmentToDelete)}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={() => void deleteAssignment()}
        title="Delete assignment"
        description={`Are you sure you want to delete "${assignmentToDelete?.title || 'this assignment'}"? This action cannot be undone.`}
        confirmText="Delete assignment"
        variant="danger"
        loading={deleteAssignmentLoading}
      />

      <ConfirmModal
        open={Boolean(chapterToDelete)}
        onClose={() => setChapterToDelete(null)}
        onConfirm={() => void deleteChapter()}
        title="Delete chapter"
        description={`Delete “${chapterToDelete?.title || 'this chapter'}” and all of its lessons? This cannot be undone.`}
        confirmText="Delete chapter"
        variant="danger"
        loading={deleteChapterLoading}
      />

      <ConfirmModal
        open={Boolean(lessonToDelete)}
        onClose={() => setLessonToDelete(null)}
        onConfirm={() => void deleteLesson()}
        title="Delete lesson"
        description={`Are you sure you want to delete “${lessonToDelete?.title || 'this lesson'}”? This cannot be undone.`}
        confirmText="Delete lesson"
        variant="danger"
        loading={deleteLessonLoading}
      />
    </RoleShell>
  );
}
