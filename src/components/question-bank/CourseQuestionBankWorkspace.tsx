'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QuestionModal from '@/components/QuestionModal';
import CSVUploadModal from '@/components/CSVUploadModal';
import QuestionViewModal from '@/components/QuestionViewModal';
import ConfirmModal from '@/components/ui/confirm-modal';
import { apiFetch } from '@/lib/api/httpClient';
import { questionsStaffService } from '@/services/questionsStaffService';
import { Question as QuestionType } from '@/types/exam';
import {
  LuPlus,
  LuSearch,
  LuBookOpen,
  LuPencil,
  LuTrash2,
  LuEye,
  LuUpload,
  LuLayers,
  LuSlidersHorizontal,
  LuChevronDown,
  LuLayoutGrid,
  LuList,
  LuChevronLeft,
  LuChevronRight,
  LuCheck,
  LuX,
  LuLibrary,
  LuCopy,
} from 'react-icons/lu';
import BorrowFromPlatformModal from '@/components/platform-question-bank/BorrowFromPlatformModal';
import { QuestionBankGradeRail } from '@/components/question-bank/QuestionBankGradeRail';
import { QuestionBankSplitLayout } from '@/components/question-bank/QuestionBankPageLayout';
import { QuestionBankSubjectSidebar } from '@/components/question-bank/QuestionBankSubjectSidebar';
import { resolveDisplayQid } from '@/lib/pastPaperCode';
import { isCourseLevelTestTopic } from '@/lib/resources/testYourselfTestName';
import { MathText } from '@/components/ui/MathText';

type BankRole = 'admin' | 'instructor';

type EnrichedQuestion = QuestionType & {
  course?: { _id: string; title: string };
  chapter?: { _id: string; title: string };
  examInfo?: { _id: string; title: string };
  lessonInfo?: { _id: string; title: string };
  tags?: string[];
  sourcePlatformQuestionId?: string;
  platformQuestionId?: string;
  isSharedPlatform?: boolean;
  isForked?: boolean;
  qid?: string;
  subject?: string;
  subjectCode?: string;
  topic?: string;
  subtopic?: string;
  year?: number;
  session?: 'FM' | 'MJ' | 'ON' | string;
  paper?: string;
  questionNumber?: string;
  sourceType?: string;
  category?: string;
};

type CourseNode = { _id: string; title: string; subjectName?: string; grade?: string };
type SubjectGroup = { key: string; label: string; courseIds: string[] };

/** Placeholder / Test Yourself courses that should not clutter the subject rail. */
function isJunkSubjectLabel(label: string) {
  const t = label.trim().toLowerCase();
  return (
    !t ||
    t === 'test' ||
    t === 'tests' ||
    t === 'test yourself' ||
    t === 'course' ||
    t === 'untitled'
  );
}
type ChapterNode = { _id: string; title: string; course: string };
type ExamNode = { _id: string; title: string; course?: string };

type Stats = {
  totalQuestions: number;
  activeQuestions: number;
  mcqQuestions: number;
  totalMarks: number;
};

const DIFF_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  easy: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  medium: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  hard: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
};

const BRAND_GRADIENT =
  'bg-gradient-to-br from-primary via-primary/95 to-primary/75 hover:from-primary/95 hover:via-primary hover:to-primary/85';
const ACCENT_TEXT = 'text-primary';

const SELECT_CLS =
  'rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

interface Props {
  role: BankRole;
  title?: string;
  description?: string;
  hidePageHeader?: boolean;
}

export default function CourseQuestionBankWorkspace({
  role,
  title = 'Question Bank',
  description = 'Browse questions by course and chapter',
  hidePageHeader = false,
}: Props) {
  const [courses, setCourses] = useState<CourseNode[]>([]);
  const [registeredSubjects, setRegisteredSubjects] = useState<string[]>([]);
  const [chaptersByCourse, setChaptersByCourse] = useState<Record<string, ChapterNode[]>>({});
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedTopicName, setSelectedTopicName] = useState<string | null>(null);
  const [bankTopics, setBankTopics] = useState<string[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonsByChapter, setLessonsByChapter] = useState<Record<string, { _id: string; title: string }[]>>({});

  const [questions, setQuestions] = useState<EnrichedQuestion[]>([]);
  const [exams, setExams] = useState<ExamNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    activeQuestions: 0,
    mcqQuestions: 0,
    totalMarks: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EnrichedQuestion | null>(null);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState<EnrichedQuestion | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'delete' | 'activate' | 'deactivate' | null>(null);
  const [busy, setBusy] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);

  const [view, setView] = useState<'list' | 'grid'>('list');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [sidebarViewMode, setSidebarViewMode] = useState<'primary' | 'nested'>('primary');
  const questionsScrollRef = useRef<HTMLDivElement>(null);

  const subjectGroups = useMemo(() => {
    const registeredKeys = new Set(
      registeredSubjects.map((name) => name.trim().toLowerCase()).filter(Boolean),
    );
    const map = new Map<string, SubjectGroup>();
    for (const course of courses) {
      const subjectName = course.subjectName?.trim();
      // Only subjects that exist in the Subject registry (e.g. Additional Mathematics).
      if (!subjectName || !registeredKeys.has(subjectName.toLowerCase())) continue;
      if (isJunkSubjectLabel(subjectName)) continue;
      const key = subjectName.toLowerCase();
      const canonical =
        registeredSubjects.find((n) => n.trim().toLowerCase() === key)?.trim() ||
        subjectName;
      const existing = map.get(key);
      if (existing) {
        if (!existing.courseIds.includes(course._id)) existing.courseIds.push(course._id);
      } else {
        map.set(key, {
          key,
          label: canonical,
          courseIds: [course._id],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [courses, registeredSubjects]);

  const selectedSubjectGroup = useMemo(
    () => subjectGroups.find((g) => g.key === selectedSubjectKey) || null,
    [subjectGroups, selectedSubjectKey],
  );

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (search.trim()) params.set('search', search.trim());
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (examFilter !== 'all') params.set('exam', examFilter);
    if (selectedSubjectGroup) {
      params.set('subjectName', selectedSubjectGroup.label);
      const ids = selectedSubjectGroup.courseIds;
      if (ids.length === 1) {
        params.set('course', ids[0]);
      } else if (ids.length > 1) {
        params.set('courses', ids.join(','));
      }
    }
    if (role === 'instructor' && selectedTopicName) {
      params.set('topic', selectedTopicName);
    } else if (selectedChapterId) {
      params.set('chapter', selectedChapterId);
    }
    if (selectedLessonId) {
      params.set('lesson', selectedLessonId);
      if (selectedChapterId) params.set('chapter', selectedChapterId);
    }
    return params.toString();
  }, [
    role,
    pagination.page,
    pagination.limit,
    search,
    typeFilter,
    difficultyFilter,
    statusFilter,
    examFilter,
    selectedSubjectGroup,
    selectedChapterId,
    selectedTopicName,
    selectedLessonId,
  ]);

  const statsQuery = useMemo(() => {
    const params = new URLSearchParams(filterQuery);
    params.delete('page');
    params.delete('limit');
    return params.toString();
  }, [filterQuery]);

  const loadCourses = useCallback(async () => {
    const params = new URLSearchParams({
      limit: '200',
      sortBy: 'title',
      sortOrder: 'asc',
    });
    if (gradeFilter !== 'all') params.set('grade', gradeFilter);
    const res = await apiFetch(`/api/courses?${params.toString()}`);
    if (!res.ok) return;
    const json = await res.json();
    const list = json.data?.courses || json.courses || [];
    setCourses(
      list.map(
        (c: { _id: string; title?: string; subjectName?: string; grade?: string }) => ({
          _id: String(c._id),
          title: String(c.title || 'Untitled'),
          subjectName: c.subjectName ? String(c.subjectName) : undefined,
          grade: c.grade ? String(c.grade) : undefined,
        }),
      ),
    );
  }, [gradeFilter]);

  const loadRegisteredSubjects = useCallback(async () => {
    const res = await apiFetch('/api/subjects?limit=500&isActive=true');
    if (!res.ok) return;
    const json = await res.json();
    const list = json.data?.subjects || json.subjects || [];
    setRegisteredSubjects(
      list
        .map((s: { name?: string }) => String(s.name || '').trim())
        .filter(Boolean),
    );
  }, []);

  const loadChapters = useCallback(async (courseId: string) => {
    if (chaptersByCourse[courseId]) return;
    const res = await apiFetch(`/api/chapters?course=${courseId}&limit=200&sortBy=order&sortOrder=asc`);
    if (!res.ok) return;
    const json = await res.json();
    const list = json.data?.chapters || json.chapters || [];
    setChaptersByCourse((prev) => ({
      ...prev,
      [courseId]: list.map((ch: { _id: string; title?: string }) => ({
        _id: String(ch._id),
        title: String(ch.title || 'Chapter'),
        course: courseId,
      })),
    }));
  }, [chaptersByCourse]);

  const loadLessons = useCallback(async (chapterId: string) => {
    if (lessonsByChapter[chapterId]) return;
    const res = await apiFetch(`/api/lessons?chapter=${chapterId}&limit=200&sortBy=order&sortOrder=asc`);
    if (!res.ok) return;
    const json = await res.json();
    const list = json.data?.lessons || json.lessons || [];
    setLessonsByChapter((prev) => ({
      ...prev,
      [chapterId]: list.map((l: { _id: string; title?: string }) => ({
        _id: String(l._id),
        title: String(l.title || 'Lesson'),
      })),
    }));
  }, [lessonsByChapter]);

  const loadExams = useCallback(async () => {
    const res = await apiFetch('/api/exams?limit=200');
    if (!res.ok) return;
    const json = await res.json();
    const list = json.data?.exams || json.exams || [];
    setExams(
      list.map((e: { _id: string; title?: string; course?: string }) => ({
        _id: String(e._id),
        title: String(e.title || 'Exam'),
        course: e.course ? String(e.course) : undefined,
      })),
    );
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        questionsStaffService.listQuestionBank(role, filterQuery),
        questionsStaffService.questionBankStats(role, statsQuery),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setQuestions(data.data?.questions || []);
        setPagination((p) => ({ ...p, ...(data.data?.pagination || {}) }));
        if (role === 'instructor' && Array.isArray(data.data?.topics)) {
          setBankTopics(
            data.data.topics
              .map((topic: unknown) => String(topic || '').trim())
              .filter(Boolean),
          );
        }
      } else {
        setQuestions([]);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        const s = data.data?.stats || {};
        setStats({
          totalQuestions: s.totalQuestions ?? 0,
          activeQuestions: s.activeQuestions ?? 0,
          mcqQuestions: s.mcqQuestions ?? 0,
          totalMarks: s.totalMarks ?? 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [role, filterQuery, statsQuery]);

  useEffect(() => {
    loadCourses();
    loadRegisteredSubjects();
    loadExams();
  }, [loadCourses, loadRegisteredSubjects, loadExams]);

  useEffect(() => {
    if (!selectedSubjectKey) return;
    if (!subjectGroups.some((g) => g.key === selectedSubjectKey)) {
      setSelectedSubjectKey(null);
      setSelectedChapterId(null);
      setSelectedTopicName(null);
      setSelectedLessonId(null);
    }
  }, [subjectGroups, selectedSubjectKey]);

  useEffect(() => {
    loadQuestions();
    setSelectedIds(new Set());
  }, [loadQuestions]);

  // Close the "More filters" popover on outside click.
  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [moreOpen]);

  const filteredExams = useMemo(() => {
    const ids = selectedSubjectGroup?.courseIds;
    if (!ids?.length) return exams;
    const idSet = new Set(ids);
    return exams.filter((e) => (e.course ? idSet.has(e.course) : !e.course));
  }, [exams, selectedSubjectGroup]);

  const chapterOptions = useMemo(() => {
    const ids = selectedSubjectGroup?.courseIds;
    if (!ids?.length) return [];
    const seen = new Set<string>();
    const merged: ChapterNode[] = [];
    for (const courseId of ids) {
      for (const ch of chaptersByCourse[courseId] || []) {
        const key = ch.title.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(ch);
      }
    }
    return merged.sort((a, b) => a.title.localeCompare(b.title));
  }, [selectedSubjectGroup, chaptersByCourse]);

  const lessonOptions = selectedChapterId ? lessonsByChapter[selectedChapterId] || [] : [];

  const subjectSidebarItems = useMemo(
    () =>
      subjectGroups.map((group) => ({
        id: group.key,
        label: group.label,
      })),
    [subjectGroups],
  );

  const chapterSidebarItems = useMemo(() => {
    if (role === 'instructor') {
      const seen = new Set<string>();
      const items: { id: string; label: string }[] = [];
      const add = (label: string) => {
        const trimmed = label.trim();
        const key = trimmed.toLowerCase();
        if (!trimmed || seen.has(key)) return;
        seen.add(key);
        items.push({ id: trimmed, label: trimmed });
      };
      for (const topic of bankTopics) add(topic);
      for (const chapter of chapterOptions) add(chapter.title);
      return items.sort((a, b) => a.label.localeCompare(b.label));
    }
    return chapterOptions.map((chapter) => ({
      id: chapter._id,
      label: chapter.title,
    }));
  }, [role, bankTopics, chapterOptions]);

  const selectedCourseLabel = selectedSubjectGroup?.label ?? null;

  const selectSubject = (subjectKey: string | null) => {
    setSelectedSubjectKey(subjectKey);
    setSelectedChapterId(null);
    setSelectedTopicName(null);
    setBankTopics([]);
    setSelectedLessonId(null);
    setPagination((p) => ({ ...p, page: 1 }));
    setExamFilter('all');
    if (subjectKey) {
      const group = subjectGroups.find((g) => g.key === subjectKey);
      group?.courseIds.forEach((id) => void loadChapters(id));
    }
  };

  const selectChapter = (nestedId: string | null) => {
    setSelectedLessonId(null);
    setPagination((p) => ({ ...p, page: 1 }));
    if (role === 'instructor') {
      setSelectedTopicName(nestedId);
      const match = nestedId
        ? chapterOptions.find(
            (chapter) => chapter.title.trim().toLowerCase() === nestedId.trim().toLowerCase(),
          )
        : undefined;
      setSelectedChapterId(match?._id || null);
      if (match) void loadLessons(match._id);
      return;
    }
    setSelectedChapterId(nestedId);
    if (nestedId) void loadLessons(nestedId);
  };

  const handleContentWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const questionsEl = questionsScrollRef.current;
      const atTop = !questionsEl || questionsEl.scrollTop <= 0;

      if (!headerCollapsed && event.deltaY > 0) {
        setHeaderCollapsed(true);
        event.preventDefault();
        return;
      }

      if (headerCollapsed && event.deltaY < 0 && atTop) {
        setHeaderCollapsed(false);
        event.preventDefault();
      }
    },
    [headerCollapsed],
  );

  useEffect(() => {
    if (!headerCollapsed && questionsScrollRef.current) {
      questionsScrollRef.current.scrollTop = 0;
    }
  }, [headerCollapsed]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = questions.length > 0 && questions.every((q) => next.has(q._id));
      questions.forEach((q) => (allSelected ? next.delete(q._id) : next.add(q._id)));
      return next;
    });
  };

  const runBulk = async (action: 'delete' | 'activate' | 'deactivate') => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await questionsStaffService.questionBankBulk(role, { ids, action });
      if (res.ok) {
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        setBulkAction(null);
        await loadQuestions();
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (id: string) => {
    if (id.startsWith('platform:')) return;
    setBusy(true);
    try {
      const res =
        role === 'admin'
          ? await questionsStaffService.deleteAdminQuestion(id)
          : await apiFetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (res.ok) await loadQuestions();
    } finally {
      setBusy(false);
    }
  };

  const editQuestion = async (q: EnrichedQuestion) => {
    if (q.isSharedPlatform && q.platformQuestionId) {
      setBusy(true);
      try {
        const res = await apiFetch('/api/instructor/question-bank/fork', {
          method: 'POST',
          body: JSON.stringify({ platformQuestionId: q.platformQuestionId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setEditingQuestion(json.data as EnrichedQuestion);
        setShowQuestionModal(true);
        await loadQuestions();
      } finally {
        setBusy(false);
      }
      return;
    }
    setEditingQuestion(q);
    setShowQuestionModal(true);
  };

  const resetFilters = () => {
    setTypeFilter('all');
    setDifficultyFilter('all');
    setExamFilter('all');
    setStatusFilter('all');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const activeFilterCount =
    [typeFilter, difficultyFilter, examFilter, statusFilter].filter((v) => v !== 'all').length +
    (selectedLessonId ? 1 : 0);

  return (
    <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4">
      <div
        className={`grid shrink-0 transition-[grid-template-rows,opacity] duration-300 ease-out ${
          headerCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-5 pb-4">
      {/* ---------------- Header ---------------- */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {!hidePageHeader ? (
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${BRAND_GRADIENT}`}
            >
              <LuBookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
                {title}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            </div>
          </div>
        ) : null}

        <div className={`flex shrink-0 flex-wrap items-center gap-2 ${hidePageHeader ? 'ml-auto' : ''}`}>
          {role === 'instructor' && (
            <button
              onClick={() => setShowBorrowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-primary/10"
            >
              <LuLibrary className="h-4 w-4" />
              Borrow from the Platform
            </button>
          )}
          <button
            onClick={() => setShowCSVUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <LuUpload className="h-4 w-4 text-primary" />
            CSV import
          </button>
          <button
            onClick={() => {
              setEditingQuestion(null);
              setShowQuestionModal(true);
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${BRAND_GRADIENT}`}
          >
            <LuPlus className="h-4 w-4" />
            Add question
          </button>
        </div>
      </div>

          {/* ---------------- Stats strip ---------------- */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total" value={stats.totalQuestions} tone="primary" />
            <Stat label="Active" value={stats.activeQuestions} />
            <Stat label="MCQ" value={stats.mcqQuestions} />
            <Stat label="Marks" value={stats.totalMarks} tone="emerald" />
          </div>
          </div>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
        onWheelCapture={handleContentWheel}
      >
          <QuestionBankGradeRail
            value={gradeFilter}
            onChange={(grade) => {
              setGradeFilter(grade);
              setSelectedSubjectKey(null);
              setSelectedChapterId(null);
              setSelectedTopicName(null);
              setBankTopics([]);
              setSelectedLessonId(null);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />

          <QuestionBankSplitLayout
            mainScrollRef={questionsScrollRef}
            onMainWheel={handleContentWheel}
            sidebar={
              <QuestionBankSubjectSidebar
                enableViewToggle
                viewMode={sidebarViewMode}
                onViewModeChange={setSidebarViewMode}
                primaryToggleLabel="Subjects"
                nestedToggleLabel="Topics"
                search={subjectSearch}
                onSearchChange={setSubjectSearch}
                searchPlaceholder="Search subject…"
                items={subjectSidebarItems}
                activeId={selectedSubjectKey}
                onSelect={selectSubject}
                allLabel="All subjects"
                emptyMessage="No subjects for this class"
                nestedItems={chapterSidebarItems}
                activeNestedId={
                  role === 'instructor' ? selectedTopicName : selectedChapterId
                }
                onSelectNested={selectChapter}
                allNestedLabel="All topics"
                nestedEmptyMessage="No topics for this subject"
              />
            }
            main={
              <div className="space-y-5 pb-4">
                {selectedCourseLabel ? (
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">
                      {selectedCourseLabel}
                      {role === 'instructor' && selectedTopicName
                        ? ` · ${selectedTopicName}`
                        : selectedChapterId
                          ? ` · ${
                              chapterOptions.find((chapter) => chapter._id === selectedChapterId)
                                ?.title || ''
                            }`
                          : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pagination.total} question{pagination.total === 1 ? '' : 's'} in scope
                    </p>
                  </div>
                ) : null}

          {/* ---------------- Toolbar ---------------- */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-sm">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="Search questions..."
                className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder-muted-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Source"
                value={examFilter}
                onChange={(e) => {
                  setExamFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={SELECT_CLS}
              >
                <option value="all">All sources</option>
                {filteredExams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.title}
                  </option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={SELECT_CLS}
              >
                <option value="all">All levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={SELECT_CLS}
              >
                <option value="all">All types</option>
                <option value="mcq">MCQ</option>
                <option value="written">Written</option>
                <option value="true_false">True/False</option>
              </select>

              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <LuSlidersHorizontal className="h-3.5 w-3.5" />
                  More filters
                  {activeFilterCount > 0 && (
                    <span className={`rounded-full px-1.5 text-xs font-bold text-white ${BRAND_GRADIENT}`}>
                      {activeFilterCount}
                    </span>
                  )}
                  <LuChevronDown className="h-3.5 w-3.5" />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                    <FilterRow label="Lesson">
                      <select
                        value={selectedLessonId || 'all'}
                        onChange={(e) => {
                          setSelectedLessonId(e.target.value === 'all' ? null : e.target.value);
                          setPagination((p) => ({ ...p, page: 1 }));
                        }}
                        disabled={!selectedChapterId}
                        className={`${SELECT_CLS} w-full disabled:opacity-50`}
                      >
                        <option value="all">All lessons</option>
                        {lessonOptions.map((l) => (
                          <option key={l._id} value={l._id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    </FilterRow>

                    <FilterRow label="Status">
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setPagination((p) => ({ ...p, page: 1 }));
                        }}
                        className={`${SELECT_CLS} w-full`}
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </FilterRow>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <button
                        onClick={resetFilters}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Clear filters
                      </button>
                      <button
                        onClick={() => setMoreOpen(false)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white ${BRAND_GRADIENT}`}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
                <button
                  onClick={() => setView('list')}
                  title="List view"
                  className={`rounded-md p-1.5 ${
                    view === 'list' ? `text-white ${BRAND_GRADIENT}` : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <LuList className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('grid')}
                  title="Grid view"
                  className={`rounded-md p-1.5 ${
                    view === 'grid' ? `text-white ${BRAND_GRADIENT}` : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <LuLayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ---------------- Bulk action bar ---------------- */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5">
              <div className={`flex items-center gap-2 text-sm font-semibold ${ACCENT_TEXT}`}>
                <LuCheck className="h-4 w-4" />
                {selectedIds.size} selected
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={busy}
                  onClick={() => runBulk('activate')}
                    className={`inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-card px-2.5 py-1.5 text-xs font-semibold ${ACCENT_TEXT} hover:bg-primary/10 disabled:opacity-50`}
                >
                  Activate
                </button>
                <button
                  disabled={busy}
                  onClick={() => runBulk('deactivate')}
                    className={`inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-card px-2.5 py-1.5 text-xs font-semibold ${ACCENT_TEXT} hover:bg-primary/10 disabled:opacity-50`}
                >
                  Deactivate
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    setBulkAction('delete');
                    setShowDeleteConfirm(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  <LuTrash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className={`rounded-md p-1.5 ${ACCENT_TEXT} hover:bg-purple-100`}
                >
                  <LuX className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------- List header ---------------- */}
          {!loading && questions.length > 0 && (
            <div className="flex items-center gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <input
                type="checkbox"
                checked={questions.every((q) => selectedIds.has(q._id))}
                onChange={toggleAllOnPage}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Select page
              {pagination.total > 0 && (
                <span className="ml-auto normal-case tracking-normal text-slate-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total}
                </span>
              )}
            </div>
          )}

          {/* ---------------- Content ---------------- */}
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading questions…</p>
          ) : questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <LuSearch className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No questions match these filters
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different course, chapter, or clearing your filters.
              </p>
              <button
                onClick={() => {
                  setSelectedSubjectKey(null);
                  setSelectedChapterId(null);
                  setSelectedLessonId(null);
                  setSearch('');
                  resetFilters();
                }}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white ${BRAND_GRADIENT}`}
              >
                Reset all filters
              </button>
            </div>
          ) : view === 'list' ? (
            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {questions.map((q) => {
                const checked = selectedIds.has(q._id);
                return (
                  <div
                    key={q._id}
                    className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                      checked ? 'bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={Boolean(q.isSharedPlatform)}
                      onChange={() => toggleSelect(q._id)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-40"
                    />
                    <div className="min-w-0 flex-1">
                      <MathText as="p" className="line-clamp-2 text-sm leading-snug text-slate-800" text={q.question} />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <QuestionBadges q={q} />
                      </div>
                    </div>
                    <QuestionActions
                      busy={busy}
                      shared={Boolean(q.isSharedPlatform)}
                      onView={() => {
                        setViewingQuestion(q);
                        setShowViewModal(true);
                      }}
                      onEdit={() => void editQuestion(q)}
                      onDelete={() => void deleteOne(q._id)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {questions.map((q) => {
                const checked = selectedIds.has(q._id);
                return (
                  <div
                    key={q._id}
                    className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm ${
                      checked ? 'border-primary/40 ring-2 ring-primary/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={Boolean(q.isSharedPlatform)}
                        onChange={() => toggleSelect(q._id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <MathText as="p" className="line-clamp-3 text-sm leading-snug text-slate-800" text={q.question} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <QuestionBadges q={q} />
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-medium text-slate-400">{q.marks} marks</span>
                      <QuestionActions
                        busy={busy}
                        shared={Boolean(q.isSharedPlatform)}
                        onView={() => {
                          setViewingQuestion(q);
                          setShowViewModal(true);
                        }}
                        onEdit={() => void editQuestion(q)}
                        onDelete={() => void deleteOne(q._id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---------------- Pagination ---------------- */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <LuChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <LuChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
              </div>
            }
          />
      </div>

      <QuestionModal
        open={showQuestionModal}
        question={editingQuestion}
        role={role}
        defaultSubject={selectedSubjectKey}
        defaultTopic={selectedTopicName}
        defaultGrade={gradeFilter !== 'all' ? gradeFilter : null}
        onClose={() => {
          setShowQuestionModal(false);
          setEditingQuestion(null);
        }}
        onSuccess={() => {
          setShowQuestionModal(false);
          loadQuestions();
        }}
      />
      <CSVUploadModal
        open={showCSVUpload}
        examId={examFilter !== 'all' ? examFilter : undefined}
        onClose={() => setShowCSVUpload(false)}
        onSuccess={() => {
          setShowCSVUpload(false);
          loadQuestions();
        }}
      />
      <QuestionViewModal
        open={showViewModal}
        question={viewingQuestion}
        onClose={() => {
          setShowViewModal(false);
          setViewingQuestion(null);
        }}
      />
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete questions?"
        description={`Delete ${selectedIds.size} selected question(s)? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={busy}
        onConfirm={() => bulkAction === 'delete' && runBulk('delete')}
        onClose={() => {
          setShowDeleteConfirm(false);
          setBulkAction(null);
        }}
      />
      {role === 'instructor' && (
        <BorrowFromPlatformModal
          open={showBorrowModal}
          onClose={() => setShowBorrowModal(false)}
          onSubmitted={() => void loadQuestions()}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational pieces */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'primary' | 'emerald';
}) {
  const styles =
    tone === 'primary'
      ? 'border-primary/20 bg-primary/5'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-white';
  const labelStyle =
    tone === 'primary' ? 'text-primary' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-500';
  const valueStyle =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'emerald'
        ? 'text-emerald-700'
        : 'text-slate-900';
  return (
    <div className={`rounded-xl border px-4 py-3 text-center shadow-sm ${styles}`}>
      <div className={`text-xl font-bold ${valueStyle}`}>{value}</div>
      <div className={`mt-0.5 text-xs font-medium ${labelStyle}`}>{label}</div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function QuestionBadges({ q }: { q: EnrichedQuestion }) {
  const diff = DIFF_STYLES[q.difficulty];
  const diffLabel = q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : '';
  const typeLabel = (q.type || '').replace('_', ' ').toUpperCase();
  const subjectLabel = q.subject || q.category || q.course?.title;
  const topicLabel =
    q.topic && !isCourseLevelTestTopic(q.topic)
      ? q.topic
      : q.chapter?.title || undefined;
  const qid = resolveDisplayQid({
    qid: q.qid,
    subjectCode: q.subjectCode,
    session: q.session,
    year: q.year,
    paper: q.paper,
    questionNumber: q.questionNumber,
  });

  return (
    <>
      {diff && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${diff.bg} ${diff.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${diff.dot}`} />
          {diffLabel}
        </span>
      )}
      {typeLabel && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            q.type === 'mcq' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {typeLabel}
        </span>
      )}
      {subjectLabel && (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          <LuBookOpen className="h-2.5 w-2.5" />
          {subjectLabel}
        </span>
      )}
      {topicLabel && (
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {topicLabel}
        </span>
      )}
      {q.subtopic && (
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {q.subtopic}
        </span>
      )}
      {q.examInfo?.title && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${BRAND_GRADIENT}`}>
          {q.examInfo.title}
        </span>
      )}
      {q.lessonInfo?.title && !q.examInfo && (
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          Lesson: {q.lessonInfo.title}
        </span>
      )}
      {qid && <CopyableQid qid={qid} />}
      {(q.isSharedPlatform ||
        q.sourcePlatformQuestionId ||
        q.tags?.includes('platform-borrow') ||
        q.tags?.includes('platform-shared')) && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            q.isSharedPlatform
              ? 'bg-sky-50 text-sky-700'
              : 'bg-violet-50 text-violet-700'
          }`}
        >
          {q.isSharedPlatform ? 'Shared' : 'Your copy'}
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        <LuLayers className="h-2.5 w-2.5" />
        {q.marks} marks
      </span>
      {q.isActive === false && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
          Inactive
        </span>
      )}
    </>
  );
}

function CopyableQid({ qid }: { qid: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(qid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void copy();
      }}
      title="Copy question ID"
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      {qid}
      {copied ? <LuCheck className="h-3 w-3 text-emerald-600" /> : <LuCopy className="h-3 w-3" />}
    </button>
  );
}

function QuestionActions({
  busy,
  shared,
  onView,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  shared?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const btn = 'rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800';
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button title="Preview" onClick={onView} className={btn}>
        <LuEye className="h-4 w-4" />
      </button>
      <button
        title={shared ? 'Edit creates your private copy' : 'Edit'}
        onClick={onEdit}
        disabled={busy}
        className={btn}
      >
        <LuPencil className="h-4 w-4" />
      </button>
      {!shared && (
        <button
          title="Delete"
          disabled={busy}
          onClick={onDelete}
          className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <LuTrash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
