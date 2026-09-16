'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorCard,
  InstructorEmptyState,
  InstructorLoadingState,
  InstructorPage,
  InstructorSplitPane,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { coursesStaffService } from '@/services/coursesStaffService';
import { resourceScopeService } from '@/services/resourceScopeService';
import { apiFetch } from '@/lib/api/httpClient';
import { MathText } from '@/components/ui/MathText';
import type { Course } from '@/types/course';
import {
  LuArrowLeft,
  LuArrowRight,
  LuEye,
  LuLibrary,
  LuLoader,
  LuPlus,
  LuTrash2,
  LuX,
} from 'react-icons/lu';

type BankQuestion = {
  _id: string;
  question: string;
  type?: string;
  marks?: number;
  difficulty?: string;
  options?: Array<{ text: string; isCorrect?: boolean }>;
  correctAnswer?: string;
  platformQuestionId?: string;
};

type SelectedQuestion = {
  questionId: string;
  question: string;
  marks: number;
  type?: string;
  options?: Array<{ text: string; isCorrect?: boolean }>;
  correctAnswer?: string;
};

type CurriculumOption = { _id: string; label: string };

export function InstructorTestCreatorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTestId = searchParams.get('id')?.trim() || '';
  const loadedEditIdRef = useRef('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<CurriculumOption[]>([]);
  const [lessons, setLessons] = useState<CurriculumOption[]>([]);
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [selected, setSelected] = useState<SelectedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBank, setLoadingBank] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [form, setForm] = useState({
    title: '',
    courseId: '',
    chapterId: '',
    lessonId: '',
    duration: '60',
    description: '',
  });

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await coursesStaffService.listCourses(
          'limit=100&sortBy=updatedAt&sortOrder=desc',
        );
        const data = await res.json();
        const rows = (data?.data?.courses as Course[]) || [];
        setCourses(rows);
        if (rows[0] && !editTestId) {
          setForm((f) => ({ ...f, courseId: f.courseId || rows[0]._id }));
        }
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!form.courseId) {
      setChapters([]);
      setForm((f) => ({ ...f, chapterId: '', lessonId: '' }));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await resourceScopeService.listChapters(form.courseId);
        if (cancelled) return;
        setChapters(list);
        setForm((f) => {
          const chapterId = list.some(
            (chapter) => chapter._id === f.chapterId,
          )
            ? f.chapterId
            : list[0]?._id || '';
          return {
            ...f,
            chapterId,
            lessonId: chapterId === f.chapterId ? f.lessonId : '',
          };
        });
      } catch {
        if (cancelled) return;
        setChapters([]);
        setForm((f) => ({ ...f, chapterId: '', lessonId: '' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.courseId]);

  useEffect(() => {
    if (!form.chapterId) {
      setLessons([]);
      setForm((f) => ({ ...f, lessonId: '' }));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await resourceScopeService.listLessons(form.chapterId);
        if (cancelled) return;
        setLessons(list);
        setForm((f) => ({
          ...f,
          lessonId: list.some((lesson) => lesson._id === f.lessonId)
            ? f.lessonId
            : '',
        }));
      } catch {
        if (cancelled) return;
        setLessons([]);
        setForm((f) => ({ ...f, lessonId: '' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.chapterId]);

  useEffect(() => {
    if (
      !editTestId ||
      courses.length === 0 ||
      loadedEditIdRef.current === editTestId
    ) {
      return;
    }
    loadedEditIdRef.current = editTestId;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/api/instructor/practice-tests/${encodeURIComponent(editTestId)}`,
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to load test');
          return;
        }
        const test = data.data as Record<string, any>;
        const courseId =
          typeof test.course === 'object'
            ? String(test.course?._id || '')
            : String(test.course || '');
        const chapterId =
          typeof test.chapter === 'object'
            ? String(test.chapter?._id || '')
            : String(test.chapter || '');
        const lessonId =
          typeof test.lesson === 'object'
            ? String(test.lesson?._id || '')
            : String(test.lesson || '');
        setForm({
          title: String(test.title || ''),
          courseId,
          chapterId,
          lessonId,
          duration: String(test.durationMinutes || 60),
          description: String(test.description || ''),
        });
        setSelected(
          (Array.isArray(test.questions) ? test.questions : [])
            .map((entry: Record<string, any>) => {
              const question = entry.question;
              if (!question || typeof question !== 'object') return null;
              return {
                questionId: String(question._id || ''),
                question: String(question.question || ''),
                marks: Number(entry.marks) || Number(question.marks) || 1,
                type: String(question.type || 'mcq'),
                options: Array.isArray(question.options)
                  ? question.options
                  : [],
                correctAnswer: question.correctAnswer
                  ? String(question.correctAnswer)
                  : undefined,
              } satisfies SelectedQuestion;
            })
            .filter(Boolean) as SelectedQuestion[],
        );
      } catch {
        setError('Failed to load test');
      } finally {
        setLoading(false);
      }
    })();
  }, [courses.length, editTestId]);

  useEffect(() => {
    if (!form.courseId || !form.chapterId) {
      setBank([]);
      return;
    }
    void (async () => {
      setLoadingBank(true);
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '50',
          course: form.courseId,
          chapter: form.chapterId,
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        const res = await apiFetch(
          `/api/instructor/question-bank?${params.toString()}`,
        );
        const data = await res.json();
        setBank((data?.data?.questions as BankQuestion[]) || []);
      } catch {
        setBank([]);
      } finally {
        setLoadingBank(false);
      }
    })();
  }, [search, form.courseId, form.chapterId]);

  const totalMarks = useMemo(
    () => selected.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
    [selected],
  );

  const selectedSubjectName = useMemo(() => {
    if (!form.courseId) return '';
    const course = courses.find((c) => c._id === form.courseId);
    return course?.subjectName || '';
  }, [form.courseId, courses]);

  const selectedChapterLabel = useMemo(() => {
    if (!form.chapterId) return '';
    return chapters.find((c) => c._id === form.chapterId)?.label || '';
  }, [form.chapterId, chapters]);

  const bankScopeLabel = [selectedSubjectName, selectedChapterLabel]
    .filter(Boolean)
    .join(' · ');

  const addQuestion = async (q: BankQuestion) => {
    if (selected.some((s) => s.questionId === q._id)) return;
    let question = q;
    if (q._id.startsWith('platform:')) {
      try {
        const response = await apiFetch('/api/instructor/question-bank/fork', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platformQuestionId:
              q.platformQuestionId || q._id.replace(/^platform:/, ''),
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.data?._id) {
          setError(data.error || 'Failed to add shared question');
          return;
        }
        question = {
          ...q,
          ...data.data,
          _id: String(data.data._id),
        };
      } catch {
        setError('Failed to add shared question');
        return;
      }
    }
    if (selected.some((item) => item.questionId === question._id)) return;
    setSelected((prev) => [
      ...prev,
      {
        questionId: question._id,
        question: question.question,
        marks: Number(question.marks) || 1,
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
      },
    ]);
  };

  const saveTest = async (publish: boolean) => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!form.courseId || !form.chapterId) {
      setError('Select a course and chapter');
      return;
    }
    if (selected.length === 0) {
      setError('Add at least one question');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch(
        editTestId
          ? `/api/instructor/practice-tests/${encodeURIComponent(editTestId)}`
          : '/api/instructor/practice-tests',
        {
        method: editTestId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          courseId: form.courseId,
          chapterId: form.chapterId,
          lessonId: form.lessonId || undefined,
          durationMinutes: Number(form.duration) || 60,
          description: form.description.trim() || undefined,
          publish,
          status: publish ? 'published' : 'draft',
          questions: selected.map((q, index) => ({
            questionId: q.questionId,
            marks: q.marks,
            order: index,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to save test');
        return;
      }
      const savedId = String(data?.data?._id || editTestId || '');
      const savedCount = Array.isArray(data?.data?.questions)
        ? data.data.questions.length
        : selected.length;
      const savedMarks = Number(data?.data?.totalMarks) || totalMarks;
      setNotice(
        publish
          ? `Published with ${savedCount} questions · ${savedMarks} marks.`
          : `Draft saved with ${savedCount} questions · ${savedMarks} marks.`,
      );
      if (!editTestId && savedId) {
        loadedEditIdRef.current = savedId;
        router.replace(`/instructor/tests?id=${encodeURIComponent(savedId)}`);
      }
    } catch {
      setError('Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title={editTestId ? 'Edit Test' : 'Test Creator'}
          subtitle={
            editTestId
              ? 'Update questions, placement, duration, and publishing status'
              : 'Assemble a course-curriculum practice test from your question bank'
          }
          actions={
            <Button variant="outline" asChild>
              <Link href="/instructor/exams">Manage exams</Link>
            </Button>
          }
        />

        {loading ? (
          <InstructorLoadingState label="Loading courses…" />
        ) : (
          <>
            <InstructorCard title="Test setup">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="e.g. Vectors practice"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Course</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.courseId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, courseId: e.target.value }))
                    }
                    disabled={Boolean(editTestId)}
                  >
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input
                    value={selectedSubjectName}
                    readOnly
                    placeholder="Auto-filled from course"
                    className="h-10 cursor-default bg-muted/40 text-muted-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Chapter</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.chapterId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        chapterId: e.target.value,
                        lessonId: '',
                      }))
                    }
                  >
                    {chapters.length === 0 ? (
                      <option value="">No chapters</option>
                    ) : (
                      chapters.map((chapter) => (
                        <option key={chapter._id} value={chapter._id}>
                          {chapter.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Lesson (optional)</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.lessonId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lessonId: e.target.value }))
                    }
                    disabled={!form.chapterId || lessons.length === 0}
                  >
                    <option value="">Chapter-level test</option>
                    {lessons.map((lesson) => (
                      <option key={lesson._id} value={lesson._id}>
                        {lesson.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Time limit (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duration: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Optional instructions for students"
                  />
                </div>
              </div>
            </InstructorCard>

            <InstructorSplitPane
              left={
                <InstructorCard title="Question bank">
                  {bankScopeLabel ? (
                    <p className="mb-2 text-xs font-medium text-foreground/80">
                      {bankScopeLabel}
                    </p>
                  ) : null}
                  <div className="mb-3">
                    <Input
                      placeholder="Search questions…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={!form.chapterId}
                    />
                  </div>
                  {!form.chapterId ? (
                    <div className="rounded-xl border border-dashed border-border py-10 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        Select a chapter to load questions
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The question bank is filtered by chapter / topic.
                      </p>
                    </div>
                  ) : loadingBank ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                      <LuLoader className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : bank.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border py-10 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        {selectedChapterLabel
                          ? `No questions found for “${selectedChapterLabel}”`
                          : 'No questions found'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add questions to your bank or borrow from the platform.
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/instructor/question-bank">
                            Open question bank
                          </Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link href="/instructor/platform-question-bank">
                            <LuLibrary className="mr-1.5 h-3.5 w-3.5" />
                            Borrow questions from platform
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-[480px] space-y-2 overflow-y-auto">
                      {bank.map((q) => {
                        const already = selected.some(
                          (s) => s.questionId === q._id,
                        );
                        return (
                          <div
                            key={q._id}
                            className="rounded-xl border border-border p-3"
                          >
                            <p className="line-clamp-2 text-sm font-medium">
                              <MathText text={q.question} />
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">
                                {(q.type || 'mcq').replace('_', ' ')} ·{' '}
                                {q.marks || 1} marks
                              </span>
                              <Button
                                size="sm"
                                variant={already ? 'secondary' : 'outline'}
                                disabled={already}
                                onClick={() => void addQuestion(q)}
                              >
                                <LuPlus className="mr-1 h-3.5 w-3.5" />
                                {already ? 'Added' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </InstructorCard>
              }
              right={
                <InstructorCard
                  title="Selected questions"
                  actions={
                    <span className="text-xs font-semibold text-muted-foreground">
                      {selected.length} Q · {totalMarks} marks
                    </span>
                  }
                >
                  {selected.length === 0 ? (
                    <InstructorEmptyState message="Add questions from your bank" />
                  ) : (
                    <div className="max-h-[480px] space-y-2 overflow-y-auto">
                      {selected.map((q, index) => (
                        <div
                          key={q.questionId}
                          className="rounded-xl border border-border p-3"
                        >
                          <p className="line-clamp-2 text-sm font-medium">
                            {index + 1}. <MathText text={q.question} />
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Label className="text-xs">Marks</Label>
                            <Input
                              className="h-8 w-20"
                              type="number"
                              min={0}
                              value={q.marks}
                              onChange={(e) =>
                                setSelected((prev) =>
                                  prev.map((row) =>
                                    row.questionId === q.questionId
                                      ? {
                                          ...row,
                                          marks: Number(e.target.value) || 0,
                                        }
                                      : row,
                                  ),
                                )
                              }
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="ml-auto text-destructive"
                              onClick={() =>
                                setSelected((prev) =>
                                  prev.filter(
                                    (row) => row.questionId !== q.questionId,
                                  ),
                                )
                              }
                            >
                              <LuTrash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={selected.length === 0}
                      onClick={() => {
                        setPreviewQuestionIndex(0);
                        setShowPreview(true);
                      }}
                    >
                      <LuEye className="mr-1.5 h-4 w-4" />
                      Student Preview
                    </Button>
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => void saveTest(false)}
                    >
                      {saving ? (
                        <LuLoader className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : null}
                      Save Draft
                    </Button>
                    <Button
                      disabled={saving}
                      onClick={() => void saveTest(true)}
                    >
                      Publish
                    </Button>
                  </div>
                  {error ? (
                    <p className="mt-3 text-sm text-destructive">{error}</p>
                  ) : null}
                  {notice ? (
                    <p className="mt-3 text-sm text-green-700">{notice}</p>
                  ) : null}
                </InstructorCard>
              }
            />
            {showPreview ? (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm">
                <div
                  className="absolute inset-0"
                  onClick={() => setShowPreview(false)}
                />
                <div
                  className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
                  role="dialog"
                  aria-modal="true"
                >
                  <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Student preview
                      </p>
                      <h2 className="text-lg font-bold">
                        {form.title.trim() || 'Untitled test'}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                    >
                      <LuX className="h-5 w-5" />
                    </button>
                  </header>
                  {selected[previewQuestionIndex] ? (
                    <div className="overflow-y-auto p-6">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-primary">
                          Question {previewQuestionIndex + 1} of {selected.length}
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                          {selected[previewQuestionIndex].marks} marks
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold leading-7">
                        {selected[previewQuestionIndex].question}
                      </h3>
                      {(selected[previewQuestionIndex].type || 'mcq') === 'mcq' ||
                      selected[previewQuestionIndex].type === 'true_false' ? (
                        <div className="mt-6 space-y-3">
                          {(selected[previewQuestionIndex].options || []).map(
                            (option, index) => (
                              <label
                                key={`${previewQuestionIndex}-${index}`}
                                className="flex items-center gap-3 rounded-xl border border-border p-4"
                              >
                                <input type="checkbox" disabled />
                                <span className="text-sm">{option.text}</span>
                              </label>
                            ),
                          )}
                        </div>
                      ) : (
                        <textarea
                          disabled
                          className="mt-6 min-h-40 w-full rounded-xl border border-border bg-background p-4"
                          placeholder="Student writes the answer here…"
                        />
                      )}
                    </div>
                  ) : null}
                  <footer className="flex items-center justify-between border-t border-border px-5 py-4">
                    <Button
                      variant="outline"
                      disabled={previewQuestionIndex === 0}
                      onClick={() =>
                        setPreviewQuestionIndex((index) => Math.max(0, index - 1))
                      }
                    >
                      <LuArrowLeft className="mr-1.5 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      disabled={previewQuestionIndex >= selected.length - 1}
                      onClick={() =>
                        setPreviewQuestionIndex((index) =>
                          Math.min(selected.length - 1, index + 1),
                        )
                      }
                    >
                      Next
                      <LuArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </footer>
                </div>
              </div>
            ) : null}
          </>
        )}
      </InstructorPage>
    </InstructorRoleShell>
  );
}
