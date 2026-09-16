'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WelcomeSection from '@/components/WelcomeSection';
import PageSection from '@/components/PageSection';
import PlatformQuestionModal, {
  type PlatformQuestionRow,
} from '@/components/platform-question-bank/PlatformQuestionModal';
import PlatformInstructorAccessBanner from '@/components/platform-question-bank/PlatformInstructorAccessBanner';
import { platformQuestionsService } from '@/services/platformQuestionsService';
import { testYourselfTestsService } from '@/services/testYourselfTestsService';
import { formatCourseTestName, formatTestYourselfName, TEST_YOURSELF_COURSE_TOPIC } from '@/lib/resources/testYourselfTestName';
import type { TestYourselfTestRow } from '@/types/testYourselfTest';
import type { TestYourselfQuestion } from '@/types/testYourself';
import {
  ResourceSubjectFields,
  type ResourceSubjectValue,
} from '@/components/resources/ResourceSubjectFields';
import {
  LuPlus,
  LuSearch,
  LuPencil,
  LuExternalLink,
  LuDatabase,
  LuEye,
  LuEyeOff,
  LuTrash2,
  LuList,
} from 'react-icons/lu';

type BankRole = 'admin' | 'instructor';

type SubjectNode = {
  subject: string;
  topics: { topic: string; count?: number; testYourselfCount?: number }[];
};

interface Props {
  role: BankRole;
}

export function TestYourselfStaffWorkspace({ role }: Props) {
  const [subjectTree, setSubjectTree] = useState<SubjectNode[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [tests, setTests] = useState<TestYourselfTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasAdminQbAccess, setHasAdminQbAccess] = useState(role === 'admin');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubjectScope, setCreateSubjectScope] = useState<ResourceSubjectValue>({});
  const [createSubject, setCreateSubject] = useState('');
  const [createName, setCreateName] = useState('');
  const [createFreeLimit, setCreateFreeLimit] = useState('5');
  const [createEnrolledLimit, setCreateEnrolledLimit] = useState('12');

  const [editingTest, setEditingTest] = useState<TestYourselfTestRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editFreeLimit, setEditFreeLimit] = useState('5');
  const [editEnrolledLimit, setEditEnrolledLimit] = useState('12');

  const [manageTest, setManageTest] = useState<TestYourselfTestRow | null>(null);
  const [manageQuestions, setManageQuestions] = useState<TestYourselfQuestion[]>([]);
  const [manageLoading, setManageLoading] = useState(false);

  const [showPickModal, setShowPickModal] = useState(false);
  const [pickQuestions, setPickQuestions] = useState<PlatformQuestionRow[]>([]);
  const [pickLoading, setPickLoading] = useState(false);
  const [pickTargetTest, setPickTargetTest] = useState<TestYourselfTestRow | null>(null);
  const [selectedPickIds, setSelectedPickIds] = useState<Set<string>>(new Set());

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PlatformQuestionRow | null>(null);
  const [questionModalDefaults, setQuestionModalDefaults] = useState<{
    subject?: string;
    topic?: string;
  }>({});

  const loadSubjects = useCallback(async () => {
    const res = await platformQuestionsService.subjects();
    if (!res.ok) return;
    const json = await res.json();
    setSubjectTree(json.data?.subjects ?? []);
  }, []);

  const loadAccess = useCallback(async () => {
    if (role !== 'instructor') return;
    const res = await platformQuestionsService.listAccessRequests('limit=1');
    if (!res.ok) return;
    const json = await res.json();
    setHasAdminQbAccess(Boolean(json.data?.summary?.hasActiveGrant));
  }, [role]);

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedSubject) params.set('subject', selectedSubject);
      const { res, json } = await testYourselfTestsService.list(params.toString());
      if (res.ok) {
        setTests(json.data?.tests ?? []);
      } else {
        setTests([]);
      }
    } finally {
      setLoading(false);
    }
  }, [search, selectedSubject]);

  const loadManageQuestions = useCallback(async (test: TestYourselfTestRow) => {
    setManageLoading(true);
    try {
      const { res, json } = await testYourselfTestsService.get(test._id);
      if (res.ok) {
        setManageQuestions(json.data?.questions ?? []);
        if (json.data?.test) setManageTest(json.data.test);
      }
    } finally {
      setManageLoading(false);
    }
  }, []);

  const loadPickQuestions = useCallback(async (test?: TestYourselfTestRow | null) => {
    setPickLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', page: '1' });
      const subject = test?.subject || selectedSubject;
      const topic = test?.topic;
      if (subject) params.set('subject', subject);
      if (topic) params.set('topic', topic);
      const res = await platformQuestionsService.list(params.toString());
      if (res.ok) {
        const json = await res.json();
        const rows: PlatformQuestionRow[] = json.data?.questions ?? [];
        setPickQuestions(rows.filter((q) => !q.inTestYourself));
      } else {
        setPickQuestions([]);
      }
    } finally {
      setPickLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    void loadSubjects();
    void loadAccess();
  }, [loadSubjects, loadAccess]);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  const filteredTests = useMemo(() => tests, [tests]);

  const handleCreateTest = async () => {
    const subject = (createSubjectScope.subjectName || createSubject).trim();
    const name = createName.trim() || formatCourseTestName(subject);
    if (!subject || !createSubjectScope.subjectId) return;
    setBusy(true);
    try {
      const { res } = await testYourselfTestsService.create({
        subject,
        subjectId: createSubjectScope.subjectId,
        subjectCode: createSubjectScope.subjectCode,
        grade: createSubjectScope.grade,
        topic: TEST_YOURSELF_COURSE_TOPIC,
        name,
        freeQuestionLimit: Number(createFreeLimit) || 5,
        enrolledQuestionLimit: Number(createEnrolledLimit) || 12,
      });
      if (res.ok) {
        setShowCreateModal(false);
        setCreateSubjectScope({});
        setCreateSubject('');
        setCreateName('');
        setCreateFreeLimit('5');
        setCreateEnrolledLimit('12');
        await loadTests();
        await loadSubjects();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTest = async () => {
    if (!editingTest) return;
    setBusy(true);
    try {
      const { res } = await testYourselfTestsService.update(editingTest._id, {
        name: editName.trim() || formatTestYourselfName(editingTest.topic, editingTest.subject),
        freeQuestionLimit: Number(editFreeLimit) || 5,
        enrolledQuestionLimit: Number(editEnrolledLimit) || 12,
      });
      if (res.ok) {
        setEditingTest(null);
        await loadTests();
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async (test: TestYourselfTestRow) => {
    setBusy(true);
    try {
      await testYourselfTestsService.update(test._id, { isPublished: true });
      await loadTests();
    } finally {
      setBusy(false);
    }
  };

  const handleHide = async (test: TestYourselfTestRow) => {
    setBusy(true);
    try {
      await testYourselfTestsService.update(test._id, { isPublished: false });
      await loadTests();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (test: TestYourselfTestRow) => {
    if (!window.confirm(`Delete test "${test.name}" and unpublish its questions?`)) return;
    setBusy(true);
    try {
      await testYourselfTestsService.remove(test._id);
      if (manageTest?._id === test._id) {
        setManageTest(null);
        setManageQuestions([]);
      }
      await loadTests();
      await loadSubjects();
    } finally {
      setBusy(false);
    }
  };

  const handleAddPickedQuestions = async () => {
    const target = pickTargetTest || manageTest;
    const subject = target?.subject || createSubject.trim();
    const topic = target?.topic || TEST_YOURSELF_COURSE_TOPIC;
    if (!subject || selectedPickIds.size === 0) return;
    setBusy(true);
    try {
      const { res } = await testYourselfTestsService.bulkQuestions({
        questionIds: [...selectedPickIds],
        subject,
        topic,
        action: 'add',
      });
      if (res.ok) {
        setShowPickModal(false);
        setSelectedPickIds(new Set());
        setPickTargetTest(null);
        await loadTests();
        if (manageTest) await loadManageQuestions(manageTest);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!manageTest) return;
    setBusy(true);
    try {
      const { res } = await testYourselfTestsService.bulkQuestions({
        questionIds: [questionId],
        subject: manageTest.subject,
        topic: manageTest.topic,
        action: 'remove',
      });
      if (res.ok) {
        await loadManageQuestions(manageTest);
        await loadTests();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden p-2 sm:p-4">
      <div className="shrink-0">
        <WelcomeSection
          title="Test Yourself"
          description="Manage practice tests grouped by topic and subject. Set free preview limits and add questions from the platform bank."
        />
      </div>

      {role === 'instructor' && (
        <div className="shrink-0">
          <PlatformInstructorAccessBanner
            onAccessChanged={() => {
              void loadAccess();
              void loadTests();
              void loadSubjects();
            }}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <aside className="w-full shrink-0 lg:w-[240px]">
          <Card className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subjects
            </p>
            <button
              type="button"
              className={`mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${!selectedSubject ? 'bg-primary/10 font-medium' : ''}`}
              onClick={() => setSelectedSubject(null)}
            >
              All subjects
            </button>
            <div className="scrollbar-hide max-h-[50vh] space-y-0.5 overflow-y-auto">
              {subjectTree.map((node) => (
                <button
                  key={node.subject}
                  type="button"
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${selectedSubject === node.subject ? 'bg-primary/10 font-medium' : ''}`}
                  onClick={() => setSelectedSubject(node.subject)}
                >
                  {node.subject}
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <div className="scrollbar-hide min-h-0 min-w-0 flex-1 overflow-y-auto pb-4">
          <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
            <div className="relative min-w-[160px] flex-1">
              <LuSearch className="absolute left-2 top-2.5 text-muted-foreground" size={16} />
              <Input
                className="pl-8"
                placeholder="Search tests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setCreateSubjectScope({});
                setCreateSubject('');
                setCreateName('');
                setShowCreateModal(true);
              }}
            >
              <LuPlus className="mr-1" size={16} /> Create test
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/resources/test-yourself" target="_blank" rel="noopener noreferrer">
                <LuExternalLink className="mr-1" size={16} /> Preview
              </Link>
            </Button>
          </Card>

          <PageSection>
            {loading ? (
              <p className="py-12 text-center text-muted-foreground">Loading tests...</p>
            ) : filteredTests.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                No tests yet. Create a test or add questions from the question bank.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredTests.map((test) => (
                  <Card key={test._id} className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground">{test.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{test.subject}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{test.questionCount} questions</Badge>
                          <Badge variant="secondary">
                            {test.freeQuestionLimit} free · {test.enrolledQuestionLimit ?? 12} enrolled
                            per attempt
                          </Badge>
                          <Badge variant={test.isPublished ? 'default' : 'secondary'}>
                            {test.isPublished ? 'Published' : 'Hidden'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setManageTest(test);
                            void loadManageQuestions(test);
                          }}
                        >
                          <LuList className="mr-1 h-4 w-4" />
                          Questions
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTest(test);
                            setEditName(test.name);
                            setEditFreeLimit(String(test.freeQuestionLimit));
                            setEditEnrolledLimit(String(test.enrolledQuestionLimit ?? 12));
                          }}
                        >
                          <LuPencil size={16} />
                        </Button>
                        {test.isPublished ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void handleHide(test)}
                          >
                            <LuEyeOff className="mr-1 h-4 w-4" />
                            Hide
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void handlePublish(test)}
                          >
                            <LuEye className="mr-1 h-4 w-4" />
                            Publish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleDelete(test)}
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </PageSection>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-5">
            <h3 className="mb-4 text-lg font-semibold">Create test</h3>
            <div className="space-y-3">
              <ResourceSubjectFields
                value={createSubjectScope}
                onChange={(next) => {
                  setCreateSubjectScope((current) => ({ ...current, ...next }));
                  if (next.subjectName !== undefined) {
                    setCreateSubject(next.subjectName || '');
                  }
                  if (next.subjectName) {
                    setCreateName((prev) => prev || formatCourseTestName(next.subjectName || ''));
                  }
                }}
                requireChapter={false}
              />
              <div>
                <Label>Test name</Label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Subject practice test"
                  disabled={!createSubjectScope.subjectId}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Defaults to the subject name; you can edit before saving.
                </p>
              </div>
              <div>
                <Label>Free preview questions (non-enrolled)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={createFreeLimit}
                  onChange={(e) => setCreateFreeLimit(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Default 5 if left unset.</p>
              </div>
              <div>
                <Label>Questions per attempt (enrolled)</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={createEnrolledLimit}
                  onChange={(e) => setCreateEnrolledLimit(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Default 12. Random sample from the pool each attempt.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={busy || !createSubjectScope.subjectId || !createName.trim()}
                onClick={() => void handleCreateTest()}
              >
                Create
              </Button>
            </div>
          </Card>
        </div>
      )}

      {editingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-5">
            <h3 className="mb-4 text-lg font-semibold">Edit test</h3>
            <div className="space-y-3">
              <div>
                <Label>Test name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>Free preview questions (non-enrolled)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={editFreeLimit}
                  onChange={(e) => setEditFreeLimit(e.target.value)}
                />
              </div>
              <div>
                <Label>Questions per attempt (enrolled)</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={editEnrolledLimit}
                  onChange={(e) => setEditEnrolledLimit(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingTest(null)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void handleUpdateTest()}>
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}

      {manageTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="flex max-h-[90vh] w-[min(100%,90vw)] max-w-[90vw] flex-col overflow-hidden p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{manageTest.name}</h3>
                <p className="text-sm text-muted-foreground">{manageTest.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {manageQuestions.length} published question
                  {manageQuestions.length === 1 ? '' : 's'} in this test
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setManageTest(null)}>
                Close
              </Button>
            </div>
            <div className="mb-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setQuestionModalDefaults({
                    subject: manageTest.subject,
                    topic: TEST_YOURSELF_COURSE_TOPIC,
                  });
                  setEditingQuestion(null);
                  setShowQuestionModal(true);
                }}
              >
                <LuPlus className="mr-1 h-4 w-4" />
                Create question
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPickTargetTest(manageTest);
                  void loadPickQuestions(manageTest);
                  setShowPickModal(true);
                }}
              >
                <LuDatabase className="mr-1 h-4 w-4" />
                Add from QB
              </Button>
            </div>
            <div className="scrollbar-hide min-h-0 flex-1 space-y-2 overflow-y-auto">
              {manageLoading ? (
                <p className="text-sm text-muted-foreground">Loading questions...</p>
              ) : manageQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No questions in this test yet. Add from the question bank or create a new
                  question.
                </p>
              ) : (
                manageQuestions.map((q) => (
                  <div
                    key={q._id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm">{q.questionText}</p>
                      <p className="mt-1 text-xs text-muted-foreground">In this test</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleRemoveQuestion(q._id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {showPickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="flex max-h-[90vh] w-[min(100%,90vw)] max-w-[90vw] flex-col overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Add from question bank</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowPickModal(false)}>
                Close
              </Button>
            </div>
            {!pickTargetTest && !manageTest ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Open a test and use &quot;Add from QB&quot; there, or create a test first so
                questions are grouped correctly.
              </p>
            ) : null}
            {pickLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : pickQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No unpublished questions in scope.
                {role === 'instructor' && !hasAdminQbAccess
                  ? ' Request admin QB access to import admin questions.'
                  : null}
              </p>
            ) : (
              <>
                <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
                  <div className="min-w-0 rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Question bank</p>
                      <span className="text-xs text-muted-foreground">{pickQuestions.length} shown</span>
                    </div>
                    <div className="scrollbar-hide max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                      {pickQuestions.map((q) => {
                        const already = selectedPickIds.has(q._id);
                        return (
                          <div key={q._id} className="rounded-xl border border-border p-3">
                            <p className="line-clamp-2 text-sm font-medium">{q.questionText}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">
                                {q.subject} · {q.topic}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant={already ? 'secondary' : 'outline'}
                                disabled={already}
                                onClick={() => {
                                  setSelectedPickIds((prev) => {
                                    const next = new Set(prev);
                                    next.add(q._id);
                                    return next;
                                  });
                                }}
                              >
                                <LuPlus className="mr-1 h-3.5 w-3.5" />
                                {already ? 'Added' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Selected questions</p>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {selectedPickIds.size} Q
                      </span>
                    </div>
                    <div className="scrollbar-hide max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                      {selectedPickIds.size === 0 ? (
                        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                          Add questions from the bank
                        </p>
                      ) : (
                        pickQuestions
                          .filter((q) => selectedPickIds.has(q._id))
                          .map((q, index) => (
                            <div key={q._id} className="rounded-xl border border-border p-3">
                              <p className="line-clamp-2 text-sm font-medium">
                                {index + 1}. {q.questionText}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {q.subject} · {q.topic}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setSelectedPickIds((prev) => {
                                      const next = new Set(prev);
                                      next.delete(q._id);
                                      return next;
                                    });
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowPickModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={busy || selectedPickIds.size === 0}
                    onClick={() => void handleAddPickedQuestions()}
                  >
                    Add {selectedPickIds.size > 0 ? `(${selectedPickIds.size})` : ''} to test
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <PlatformQuestionModal
        open={showQuestionModal}
        question={editingQuestion}
        role={role}
        defaultSubject={questionModalDefaults.subject || selectedSubject}
        defaultTopic={questionModalDefaults.topic}
        defaultAccessPolicy="public"
        onClose={() => {
          setShowQuestionModal(false);
          setEditingQuestion(null);
        }}
        onSuccess={async () => {
          setShowQuestionModal(false);
          setEditingQuestion(null);
          if (manageTest && questionModalDefaults.subject) {
            await testYourselfTestsService.create({
              subject: questionModalDefaults.subject,
              topic: TEST_YOURSELF_COURSE_TOPIC,
              name: formatCourseTestName(questionModalDefaults.subject),
            });
            await loadManageQuestions(manageTest);
          }
          await loadTests();
          await loadSubjects();
        }}
      />
    </main>
  );
}
