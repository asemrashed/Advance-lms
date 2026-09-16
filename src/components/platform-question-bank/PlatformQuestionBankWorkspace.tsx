'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import PlatformQuestionModal, {
  type PlatformQuestionRow,
} from '@/components/platform-question-bank/PlatformQuestionModal';
import PlatformAccessRequestsPanel from '@/components/platform-question-bank/PlatformAccessRequestsPanel';
import PlatformInstructorAccessBanner from '@/components/platform-question-bank/PlatformInstructorAccessBanner';
import ProcessPastPaperModal from '@/components/platform-question-bank/ProcessPastPaperModal';
import ImportSheetModal from '@/components/platform-question-bank/ImportSheetModal';
import { platformQuestionsService } from '@/services/platformQuestionsService';
import { testYourselfTestsService } from '@/services/testYourselfTestsService';
import { PAST_PAPER_TOPICS } from '@/lib/pastPaperTopics';
import { resolveDisplayQid } from '@/lib/pastPaperCode';
import { normalizeBatchGrade } from '@/lib/batchGrades';
import { formatCourseTestName, TEST_YOURSELF_COURSE_TOPIC, isCourseLevelTestTopic } from '@/lib/resources/testYourselfTestName';
import { QuestionBankGradeRail } from '@/components/question-bank/QuestionBankGradeRail';
import {
  QuestionBankSplitLayout,
} from '@/components/question-bank/QuestionBankPageLayout';
import { QuestionBankSubjectSidebar } from '@/components/question-bank/QuestionBankSubjectSidebar';
import { MathText } from '@/components/ui/MathText';
import {
  LuPlus,
  LuSparkles,
  LuSearch,
  LuPencil,
  LuTrash2,
  LuLayers,
  LuUsers,
  LuExternalLink,
  LuClipboardCheck,
  LuImagePlus,
  LuTriangleAlert,
  LuSlidersHorizontal,
  LuChevronDown,
  LuLayoutGrid,
  LuList,
  LuChevronLeft,
  LuChevronRight,
  LuCheck,
  LuX,
  LuClipboardList,
  LuUpload,
  LuCopy,
} from 'react-icons/lu';

type BankRole = 'admin' | 'instructor';

type SubjectNode = {
  subject: string;
  subjectId?: string;
  subjectCode?: string;
  grade?: string;
  components?: { _id: string; name: string; type: 'mcq' | 'written'; order: number }[];
  topics: { topic: string; count: number; testYourselfCount?: number }[];
};

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

const DIFF_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  Easy: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  Medium: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  Hard: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
};

const BRAND_GRADIENT =
  'bg-gradient-to-br from-primary via-primary/95 to-primary/75 hover:from-primary/95 hover:via-primary hover:to-primary/85';
const ACCENT_TEXT = 'text-primary';

const SELECT_CLS =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

interface Props {
  role: BankRole;
  title?: string;
  description?: string;
}

export default function PlatformQuestionBankWorkspace({
  role,
  title = 'Platform Question Bank',
  description = 'Subject and topic organized questions for batches and resources',
}: Props) {
  const [subjectTree, setSubjectTree] = useState<SubjectNode[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedLessonTopic, setSelectedLessonTopic] = useState('');

  const [questions, setQuestions] = useState<PlatformQuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [testYourselfFilter, setTestYourselfFilter] = useState('all');
  const [testYourselfTotal, setTestYourselfTotal] = useState(0);
  const [testYourselfTopics, setTestYourselfTopics] = useState(0);

  const [sourceFilter, setSourceFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [completenessFilter, setCompletenessFilter] = useState('all');
  const [topicNumberFilter, setTopicNumberFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [componentFilter, setComponentFilter] = useState('all');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [pastPaperStats, setPastPaperStats] = useState<{
    total: number;
    incomplete: number;
  }>({ total: 0, incomplete: 0 });

  const [showModal, setShowModal] = useState(false);
  const [showPastPaperModal, setShowPastPaperModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [diagramTarget, setDiagramTarget] = useState<{ id: string; target: 'qp' | 'ms' } | null>(null);
  const diagramInputRef = useRef<HTMLInputElement>(null);
  const [editingQuestion, setEditingQuestion] = useState<PlatformQuestionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminTab, setAdminTab] = useState<'questions' | 'access'>('questions');

  const [view, setView] = useState<'list' | 'grid'>('list');
  const [moreOpen, setMoreOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const moreRef = useRef<HTMLDivElement>(null);
  const [showTestYourselfModal, setShowTestYourselfModal] = useState(false);
  const [tySubject, setTySubject] = useState('');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [sidebarViewMode, setSidebarViewMode] = useState<'primary' | 'nested'>('primary');
  const questionsScrollRef = useRef<HTMLDivElement>(null);

  const canEditQuestion = (q: PlatformQuestionRow) =>
    role === 'admin' || q.ownerType !== 'admin';

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (search.trim()) params.set('search', search.trim());
    if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (accessFilter !== 'all' && role === 'admin') params.set('accessPolicy', accessFilter);
    if (testYourselfFilter === 'published') params.set('testYourself', '1');
    if (selectedSubject) params.set('subject', selectedSubject);
    if (gradeFilter !== 'all') params.set('grade', gradeFilter);
    if (selectedLessonTopic) params.set('topic', selectedLessonTopic);
    if (componentFilter !== 'all') params.set('componentId', componentFilter);
    if (sourceFilter !== 'all') params.set('sourceType', sourceFilter);
    if (sessionFilter !== 'all') params.set('session', sessionFilter);
    if (completenessFilter !== 'all') params.set('completeness', completenessFilter);
    if (topicNumberFilter !== 'all') params.set('topicNumber', topicNumberFilter);
    if (/^\d{4}$/.test(yearFilter.trim())) params.set('year', yearFilter.trim());
    return params.toString();
  }, [
    pagination.page,
    pagination.limit,
    search,
    difficultyFilter,
    statusFilter,
    accessFilter,
    testYourselfFilter,
    selectedSubject,
    gradeFilter,
    selectedLessonTopic,
    componentFilter,
    sourceFilter,
    sessionFilter,
    completenessFilter,
    topicNumberFilter,
    yearFilter,
    role,
  ]);

  const loadSubjects = useCallback(async () => {
    const res = await platformQuestionsService.subjects();
    if (!res.ok) return;
    const json = await res.json();
    setSubjectTree(json.data?.subjects || []);
  }, []);

  const loadTestYourselfSummary = useCallback(async () => {
    const res = await platformQuestionsService.testYourselfSummary();
    if (!res.ok) return;
    const json = await res.json();
    setTestYourselfTotal(json.data?.total ?? 0);
    setTestYourselfTopics(json.data?.topicCount ?? 0);
  }, []);

  const loadPastPaperStats = useCallback(async () => {
    const res = await platformQuestionsService.pastPaperStats();
    if (!res.ok) return;
    const json = await res.json();
    setPastPaperStats({
      total: json.data?.total ?? 0,
      incomplete: json.data?.incomplete ?? 0,
    });
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await platformQuestionsService.list(filterQuery);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.data?.questions || []);
        setPagination((p) => ({ ...p, ...(data.data?.pagination || {}) }));
      } else {
        setQuestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [filterQuery]);

  useEffect(() => {
    loadSubjects();
    void loadTestYourselfSummary();
    void loadPastPaperStats();
  }, [loadSubjects, loadTestYourselfSummary, loadPastPaperStats]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Clear multi-select whenever the visible result set changes.
  useEffect(() => {
    setSelected(new Set());
  }, [filterQuery]);

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

  const filteredSubjectTree = useMemo(() => {
    if (gradeFilter === 'all') return subjectTree;
    const want = normalizeBatchGrade(gradeFilter);
    return subjectTree.filter((node) => {
      if (!node.grade) return false;
      return normalizeBatchGrade(node.grade) === want;
    });
  }, [subjectTree, gradeFilter]);

  const lessonOptions = useMemo(() => {
    if (!selectedSubject) return [];
    const node = filteredSubjectTree.find((n) => n.subject === selectedSubject);
    return (node?.topics ?? [])
      .map((t) => ({
        id: t.topic,
        label: t.topic,
        count: t.count,
      }))
      .filter((t) => t.id)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedSubject, filteredSubjectTree]);

  const subjectSidebarItems = useMemo(
    () =>
      filteredSubjectTree.map((node) => ({
        id: node.subject,
        label: node.subject,
        count: node.topics.reduce((sum, topic) => sum + topic.count, 0),
      })),
    [filteredSubjectTree],
  );

  // Drop selection when it falls outside the active grade filter.
  useEffect(() => {
    if (!selectedSubject) return;
    if (filteredSubjectTree.some((n) => n.subject === selectedSubject)) return;
    setSelectedSubject(null);
    setSelectedLessonTopic('');
    setComponentFilter('all');
  }, [filteredSubjectTree, selectedSubject]);

  const selectSubject = (subject: string | null) => {
    setSelectedSubject(subject);
    setSelectedLessonTopic('');
    setComponentFilter('all');
    setPagination((p) => ({ ...p, page: 1 }));
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

  useEffect(() => {
    if (adminTab === 'access') {
      setHeaderCollapsed(false);
    }
  }, [adminTab]);

  const pickTopic = (topic: string) => {
    setSelectedLessonTopic(topic);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const startDiagramUpload = (id: string, target: 'qp' | 'ms') => {
    setDiagramTarget({ id, target });
    diagramInputRef.current?.click();
  };

  const onDiagramFileChosen = async (file: File | null) => {
    const ctx = diagramTarget;
    if (diagramInputRef.current) diagramInputRef.current.value = '';
    setDiagramTarget(null);
    if (!file || !ctx) return;
    setBusy(true);
    try {
      const res = await platformQuestionsService.uploadDiagram(ctx.id, file, ctx.target);
      if (res.ok) {
        await loadQuestions();
        await loadPastPaperStats();
      }
    } finally {
      setBusy(false);
    }
  };

  const convertToMcq = async (id: string) => {
    setBusy(true);
    try {
      const res = await platformQuestionsService.convertToMcq(id);
      if (res.ok) {
        await loadQuestions();
        await loadTestYourselfSummary();
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (id: string) => {
    setBusy(true);
    try {
      const res = await platformQuestionsService.remove(id);
      if (res.ok) {
        await loadQuestions();
        await loadSubjects();
        await loadTestYourselfSummary();
        await loadPastPaperStats();
      }
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = questions.filter((q) => selected.has(q._id) && canEditQuestion(q)).map((q) => q._id);
    if (!ids.length) return;
    setBusy(true);
    try {
      for (const id of ids) {
        await platformQuestionsService.remove(id);
      }
      setSelected(new Set());
      await loadQuestions();
      await loadSubjects();
      await loadTestYourselfSummary();
      await loadPastPaperStats();
    } finally {
      setBusy(false);
    }
  };

  const bulkMakeMcq = async () => {
    const ids = questions
      .filter(
        (q) =>
          selected.has(q._id) &&
          canEditQuestion(q) &&
          (q.questionFormat === 'written' || !q.options?.length),
      )
      .map((q) => q._id);
    if (!ids.length) return;
    setBusy(true);
    try {
      for (const id of ids) {
        await platformQuestionsService.convertToMcq(id);
      }
      setSelected(new Set());
      await loadQuestions();
      await loadTestYourselfSummary();
    } finally {
      setBusy(false);
    }
  };

  const bulkAddToTestYourself = async () => {
    const ids = questions.filter((q) => selected.has(q._id) && canEditQuestion(q)).map((q) => q._id);
    const subject = tySubject.trim() || selectedSubject || '';
    if (!ids.length || !subject) return;
    setBusy(true);
    try {
      const { res } = await testYourselfTestsService.bulkQuestions({
        questionIds: ids,
        subject,
        topic: TEST_YOURSELF_COURSE_TOPIC,
        action: 'add',
      });
      if (res.ok) {
        setSelected(new Set());
        setShowTestYourselfModal(false);
        await loadQuestions();
        await loadSubjects();
        await loadTestYourselfSummary();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = questions.length > 0 && questions.every((q) => next.has(q._id));
      questions.forEach((q) => (allSelected ? next.delete(q._id) : next.add(q._id)));
      return next;
    });
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setAccessFilter('all');
    setTestYourselfFilter('all');
    setSessionFilter('all');
    setTopicNumberFilter('all');
    setCompletenessFilter('all');
    setComponentFilter('all');
    setYearFilter('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const activeFilterCount =
    [statusFilter, testYourselfFilter, sessionFilter, topicNumberFilter, completenessFilter].filter(
      (v) => v !== 'all',
    ).length +
    (role === 'admin' && accessFilter !== 'all' ? 1 : 0) +
    (/^\d{4}$/.test(yearFilter.trim()) ? 1 : 0);

  return (
    <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4">
      <div
        className={`grid shrink-0 transition-[grid-template-rows,opacity] duration-300 ease-out ${
          headerCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 pb-4">
            {/* ---------------- Header ---------------- */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${BRAND_GRADIENT}`}
          >
            <LuLayers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {role === 'admin' && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <LuUpload className="h-4 w-4 text-primary" />
                Upload sheet
              </button>
              <button
                onClick={() => setShowPastPaperModal(true)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${BRAND_GRADIENT}`}
              >
                <LuSparkles className="h-4 w-4" />
                Generate via AI
              </button>
            </>
          )}
          <button
            onClick={() => {
              setEditingQuestion(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <LuPlus className="h-4 w-4 text-primary" />
            Add question
          </button>
        </div>
      </div>

      {role === 'instructor' && (
        <div className="mt-3 shrink-0">
          <PlatformInstructorAccessBanner
            onAccessChanged={() => {
              void loadQuestions();
              void loadSubjects();
              void loadTestYourselfSummary();
            }}
          />
        </div>
      )}

      {/* ---------------- Tabs ---------------- */}
      {role === 'admin' && (
        <div className="mt-4 inline-flex shrink-0 self-start rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setAdminTab('questions')}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              adminTab === 'questions'
                ? `text-white shadow-sm ${BRAND_GRADIENT}`
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Questions
          </button>
          <button
            onClick={() => setAdminTab('access')}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              adminTab === 'access'
                ? `text-white shadow-sm ${BRAND_GRADIENT}`
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LuUsers className="h-3.5 w-3.5" />
            Access
          </button>
        </div>
      )}

      {adminTab !== 'access' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="In scope" value={pagination.total} tone="primary" />
              <Stat label="Subjects" value={filteredSubjectTree.length} />
              <Stat
                label={`Test Yourself (${testYourselfTopics} topics)`}
                value={testYourselfTotal}
                tone="emerald"
              />
              <button
                onClick={() => {
                  setCompletenessFilter((v) => (v === 'incomplete' ? 'all' : 'incomplete'));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`rounded-xl border px-4 py-3 text-left shadow-sm transition-colors ${
                  completenessFilter === 'incomplete'
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <LuTriangleAlert className="h-3.5 w-3.5" />
                  Missing diagram
                </div>
                <div className="mt-0.5 text-xl font-bold text-slate-900">
                  {pastPaperStats.incomplete}
                </div>
              </button>
            </div>
      ) : null}
          </div>
        </div>
      </div>

      {role === 'admin' && adminTab === 'access' ? (
        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          <PlatformAccessRequestsPanel />
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
          onWheelCapture={handleContentWheel}
        >
            {/* ---------------- Class / grade ---------------- */}
            <div className="shrink-0">
            <QuestionBankGradeRail
              value={gradeFilter}
              onChange={(grade) => {
                setGradeFilter(grade);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
            </div>

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
                  activeId={selectedSubject}
                  onSelect={selectSubject}
                  allLabel="All subjects"
                  emptyMessage="No subjects yet — add a question"
                  nestedItems={lessonOptions}
                  activeNestedId={selectedLessonTopic || null}
                  onSelectNested={(topicId) => pickTopic(topicId || '')}
                  allNestedLabel="All topics"
                  nestedEmptyMessage="No topics for this subject"
                />
              }
              main={
                <div className="space-y-5 pb-4">
                  {selectedSubject ? (
                    <div className="rounded-xl border border-border bg-card px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {selectedSubject}
                        {selectedLessonTopic ? ` · ${selectedLessonTopic}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {pagination.total} question{pagination.total === 1 ? '' : 's'} in scope
                      </p>
                    </div>
                  ) : null}

            {/* ---------------- Toolbar ---------------- */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 lg:max-w-md">
                <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  placeholder="Search questions, topics, tags…"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={difficultyFilter}
                  onChange={(e) => {
                    setDifficultyFilter(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={SELECT_CLS}
                >
                  <option value="all">All levels</option>
                  <option value="1">Easy</option>
                  <option value="2">Medium</option>
                  <option value="3">Hard</option>
                </select>

                <select
                  value={componentFilter}
                  onChange={(e) => {
                    setComponentFilter(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={SELECT_CLS}
                  disabled={!selectedSubject}
                >
                  <option value="all">All components</option>
                  {(
                    subjectTree.find((s) => s.subject === selectedSubject)?.components || []
                  ).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.type === 'mcq' ? 'MCQ' : 'Written'})
                    </option>
                  ))}
                </select>

                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={SELECT_CLS}
                >
                  <option value="all">All sources</option>
                  <option value="pastpaper">Past papers</option>
                  <option value="claude">AI generated</option>
                  <option value="pdf">From PDF</option>
                  <option value="manual">Manual</option>
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

                      {role === 'admin' && (
                        <FilterRow label="Access">
                          <select
                            value={accessFilter}
                            onChange={(e) => {
                              setAccessFilter(e.target.value);
                              setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`${SELECT_CLS} w-full`}
                          >
                            <option value="all">All access</option>
                            <option value="private">Private</option>
                            <option value="shared_with_instructors">Shared</option>
                            <option value="public">Public</option>
                          </select>
                        </FilterRow>
                      )}

                      <FilterRow label="Test Yourself">
                        <select
                          value={testYourselfFilter}
                          onChange={(e) => {
                            setTestYourselfFilter(e.target.value);
                            setPagination((p) => ({ ...p, page: 1 }));
                          }}
                          className={`${SELECT_CLS} w-full`}
                        >
                          <option value="all">All questions</option>
                          <option value="published">In Test Yourself</option>
                        </select>
                      </FilterRow>

                      <div className="border-t border-slate-100 pt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Past papers
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <select
                            value={sessionFilter}
                            onChange={(e) => {
                              setSessionFilter(e.target.value);
                              setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`${SELECT_CLS} w-full`}
                          >
                            <option value="all">All sessions</option>
                            <option value="FM">Feb/Mar</option>
                            <option value="MJ">May/Jun</option>
                            <option value="ON">Oct/Nov</option>
                          </select>
                          <input
                            placeholder="Year"
                            inputMode="numeric"
                            value={yearFilter}
                            onChange={(e) => {
                              setYearFilter(e.target.value.replace(/[^0-9]/g, '').slice(0, 4));
                              setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`${SELECT_CLS} w-full`}
                          />
                          <select
                            value={topicNumberFilter}
                            onChange={(e) => {
                              setTopicNumberFilter(e.target.value);
                              setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`${SELECT_CLS} col-span-2 w-full`}
                          >
                            <option value="all">All topics</option>
                            {PAST_PAPER_TOPICS.map((t) => (
                              <option key={t.number} value={String(t.number)}>
                                {t.number}. {t.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={completenessFilter}
                            onChange={(e) => {
                              setCompletenessFilter(e.target.value);
                              setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`${SELECT_CLS} col-span-2 w-full`}
                          >
                            <option value="all">All completeness</option>
                            <option value="complete">Complete</option>
                            <option value="incomplete">Missing diagram</option>
                          </select>
                        </div>
                      </div>

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

                <Link
                  href="/resources/test-yourself"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <LuExternalLink className="h-3.5 w-3.5" />
                  Preview
                </Link>

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
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5">
                <div className={`flex items-center gap-2 text-sm font-semibold ${ACCENT_TEXT}`}>
                  <LuCheck className="h-4 w-4" />
                  {selected.size} selected
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {role === 'admin' && (
                    <button
                      disabled={busy}
                      onClick={() => void bulkMakeMcq()}
                      className={`inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-white px-2.5 py-1.5 text-xs font-semibold ${ACCENT_TEXT} hover:bg-primary/10 disabled:opacity-50`}
                    >
                      <LuSparkles className="h-3.5 w-3.5" />
                      Make MCQ
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => {
                      setTySubject(selectedSubject || '');
                      setShowTestYourselfModal(true);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-white px-2.5 py-1.5 text-xs font-semibold ${ACCENT_TEXT} hover:bg-primary/10 disabled:opacity-50`}
                  >
                    <LuClipboardList className="h-3.5 w-3.5" />
                    Add to Test Yourself
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void bulkDelete()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <LuTrash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className={`rounded-md p-1.5 ${ACCENT_TEXT} hover:bg-primary/10`}
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
                  checked={questions.every((q) => selected.has(q._id))}
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
                  Try a different subject, topic, or clearing your filters.
                </p>
                <button
                  onClick={() => {
                    setSelectedSubject(null);
                    setSelectedLessonTopic('');
                    setSearch('');
                    setDifficultyFilter('all');
                    setSourceFilter('all');
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
                  const checked = selected.has(q._id);
                  return (
                    <div
                      key={q._id}
                      className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                        checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(q._id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm leading-snug text-slate-800">
                          <MathText text={q.questionText} />
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <QuestionBadges q={q} role={role} />
                        </div>
                      </div>
                      <QuestionActions
                        q={q}
                        role={role}
                        busy={busy}
                        canEdit={canEditQuestion(q)}
                        onEdit={() => {
                          setEditingQuestion(q);
                          setShowModal(true);
                        }}
                        onDelete={() => void deleteOne(q._id)}
                        onMakeMcq={() => void convertToMcq(q._id)}
                        onDiagram={(t) => startDiagramUpload(q._id, t)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {questions.map((q) => {
                  const checked = selected.has(q._id);
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
                          onChange={() => toggleRow(q._id)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <p className="line-clamp-3 text-sm leading-snug text-slate-800">
                          <MathText text={q.questionText} />
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <QuestionBadges q={q} role={role} />
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[11px] font-medium text-slate-400">
                          {(q.questionFormat === 'mcq' || q.options?.length)
                            ? `${q.options?.length || 0} options`
                            : 'Written response'}
                        </span>
                        <QuestionActions
                          q={q}
                          role={role}
                          busy={busy}
                          canEdit={canEditQuestion(q)}
                          onEdit={() => {
                            setEditingQuestion(q);
                            setShowModal(true);
                          }}
                          onDelete={() => void deleteOne(q._id)}
                          onMakeMcq={() => void convertToMcq(q._id)}
                          onDiagram={(t) => startDiagramUpload(q._id, t)}
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
      )}

      <PlatformQuestionModal
        open={showModal}
        question={editingQuestion}
        role={role}
        defaultSubject={selectedSubject}
        defaultTopic={selectedLessonTopic || null}
        onClose={() => {
          setShowModal(false);
          setEditingQuestion(null);
        }}
        onSuccess={() => {
          setShowModal(false);
          setEditingQuestion(null);
          void loadQuestions();
          void loadSubjects();
          void loadTestYourselfSummary();
        }}
      />
      <ProcessPastPaperModal
        open={showPastPaperModal}
        onClose={() => setShowPastPaperModal(false)}
        onSuccess={() => {
          setShowPastPaperModal(false);
          void loadQuestions();
          void loadSubjects();
          void loadPastPaperStats();
        }}
      />
      <ImportSheetModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          void loadQuestions();
          void loadSubjects();
          void loadPastPaperStats();
          void loadTestYourselfSummary();
        }}
      />
      {showTestYourselfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Add to Test Yourself</h3>
            <p className="mt-1 text-sm text-slate-500">
              Publish {selected.size} selected question{selected.size === 1 ? '' : 's'} to Test
              Yourself. Existing subjects and topics on the questions are kept.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Course / subject</label>
                <input
                  className={SELECT_CLS + ' w-full'}
                  value={tySubject}
                  onChange={(e) => setTySubject(e.target.value)}
                  placeholder="Course or subject name"
                />
              </div>
              {tySubject ? (
                <p className="text-sm text-slate-600">
                  Test name: <strong>{formatCourseTestName(tySubject)}</strong>
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTestYourselfModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !tySubject.trim()}
                onClick={() => void bulkAddToTestYourself()}
                className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${BRAND_GRADIENT}`}
              >
                Add to test
              </button>
            </div>
          </div>
        </div>
      )}
      <input
        ref={diagramInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => onDiagramFileChosen(e.target.files?.[0] || null)}
      />
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
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${styles}`}>
      <div className={`text-xs font-medium ${labelStyle}`}>{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${valueStyle}`}>{value}</div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      {children}
    </div>
  );
}

function QuestionBadges({ q, role }: { q: PlatformQuestionRow; role: BankRole }) {
  const diffLabel = DIFFICULTY_LABEL[q.difficulty] || String(q.difficulty);
  const diff = DIFF_STYLES[diffLabel];
  const format = (q.questionFormat || (q.options?.length ? 'mcq' : 'written')).toUpperCase();
  const componentLabelText = q.componentName
    ? `${q.componentName} · ${format}`
    : format;
  const qid = resolveDisplayQid({
    qid: q.qid,
    subjectCode: q.subjectCode,
    session: q.session,
    year: q.year,
    paper: q.paper,
    questionNumber: q.questionNumber,
  });
  const showTopic = q.topic && !isCourseLevelTestTopic(q.topic);

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
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
          format === 'MCQ' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {componentLabelText}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        <LuLayers className="h-2.5 w-2.5" />
        {q.subject}
      </span>
      {showTopic && (
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {q.topic}
        </span>
      )}
      {q.subtopic && (
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {q.subtopic}
        </span>
      )}
      {role === 'instructor' && q.ownerType === 'admin' && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${BRAND_GRADIENT}`}>
          Admin QB
        </span>
      )}
      {qid && <CopyableQid qid={qid} />}
      {q.status === 'incomplete' && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
          <LuTriangleAlert className="h-3 w-3" />
          Missing diagram
        </span>
      )}
      {q.inTestYourself && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
          <LuClipboardCheck className="h-3 w-3" />
          Test Yourself
        </span>
      )}
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
  q,
  role,
  busy,
  canEdit,
  onEdit,
  onDelete,
  onMakeMcq,
  onDiagram,
}: {
  q: PlatformQuestionRow;
  role: BankRole;
  busy: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMakeMcq: () => void;
  onDiagram: (target: 'qp' | 'ms') => void;
}) {
  if (!canEdit) {
    return <span className="px-2 text-[11px] font-medium text-slate-400">Read-only</span>;
  }
  const btn = 'rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800';
  const showMakeMcq = role === 'admin' && (q.questionFormat === 'written' || !q.options?.length);
  const showQpDiagram = q.sourceType === 'pastpaper' && q.diagramStatus === 'missing';
  const showMsDiagram =
    q.sourceType === 'pastpaper' && q.hasMsDiagram && q.msDiagramStatus === 'missing';
  return (
    <div className="flex shrink-0 items-center gap-1">
      {showQpDiagram && (
        <button
          title="Upload QP diagram"
          disabled={busy}
          onClick={() => onDiagram('qp')}
          className={btn}
        >
          <LuImagePlus className="h-4 w-4" />
        </button>
      )}
      {showMsDiagram && (
        <button
          title="Upload MS diagram"
          disabled={busy}
          onClick={() => onDiagram('ms')}
          className={btn}
        >
          <LuImagePlus className="h-4 w-4 text-amber-600" />
        </button>
      )}
      {showMakeMcq && (
        <button title="Make MCQ" disabled={busy} onClick={onMakeMcq} className={btn}>
          <LuSparkles className="h-4 w-4" />
        </button>
      )}
      <button title="Edit" onClick={onEdit} className={btn}>
        <LuPencil className="h-4 w-4" />
      </button>
      <button
        title="Delete"
        disabled={busy}
        onClick={onDelete}
        className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
      >
        <LuTrash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
