'use client';

import { useEffect, useMemo, useState } from 'react';
import FormModal from '@/components/ui/form-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api/httpClient';
import { LuLoader, LuPlus, LuTrash2 } from 'react-icons/lu';
import { MathText } from '@/components/ui/MathText';

type BankQuestion = {
  _id: string;
  question: string;
  type?: string;
  marks?: number;
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

type PracticeTestModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locked: {
    courseId: string;
    chapterId: string;
    lessonId?: string;
    subjectName?: string;
    chapterTitle?: string;
    lessonTitle?: string;
  };
};

export function PracticeTestModal({
  open,
  onClose,
  onSuccess,
  locked,
}: PracticeTestModalProps) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [selected, setSelected] = useState<SelectedQuestion[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDuration('60');
    setDescription('');
    setSearch('');
    setSelected([]);
    setError(null);
  }, [open, locked.courseId, locked.chapterId, locked.lessonId]);

  useEffect(() => {
    if (!open || !locked.courseId || !locked.chapterId) return;
    let cancelled = false;
    void (async () => {
      setLoadingBank(true);
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '50',
          course: locked.courseId,
          chapter: locked.chapterId,
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        const res = await apiFetch(
          `/api/instructor/question-bank?${params.toString()}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setBank((data?.data?.questions as BankQuestion[]) || []);
        }
      } catch {
        if (!cancelled) setBank([]);
      } finally {
        if (!cancelled) setLoadingBank(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, locked.courseId, locked.chapterId, search]);

  const totalMarks = useMemo(
    () => selected.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
    [selected],
  );

  const scopeLabel = [
    locked.chapterTitle || 'Chapter',
    locked.lessonTitle || (locked.lessonId ? 'Lesson' : 'Chapter-level'),
  ].join(' · ');

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
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (selected.length === 0) {
      setError('Add at least one question');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/instructor/practice-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          courseId: locked.courseId,
          chapterId: locked.chapterId,
          lessonId: locked.lessonId || undefined,
          durationMinutes: Number(duration) || 60,
          description: description.trim() || undefined,
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
      onSuccess();
      onClose();
    } catch {
      setError('Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Create practice test"
      description={`Scoped to ${scopeLabel}`}
      onSubmit={(e) => {
        e.preventDefault();
        void saveTest(false);
      }}
      loading={saving}
      submitText="Save draft"
      size="xl"
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Course, chapter{locked.lessonId ? ', and lesson' : ''} are set from the
          curriculum — no need to select them again.
          {locked.subjectName ? ` Subject: ${locked.subjectName}.` : ''}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Vectors practice"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Time limit (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Total marks</Label>
            <Input value={String(totalMarks)} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional instructions for students"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Question bank</p>
                {locked.chapterTitle || locked.subjectName ? (
                  <p className="truncate text-xs font-medium text-foreground/80">
                    {[locked.subjectName, locked.chapterTitle]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>
              <Input
                className="h-8 max-w-[180px]"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loadingBank ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <LuLoader className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : bank.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No questions found for{' '}
                {locked.chapterTitle
                  ? `“${locked.chapterTitle}”`
                  : 'this chapter'}
                .
              </p>
            ) : (
              <div className="max-h-[320px] space-y-2 overflow-y-auto">
                {bank.map((q) => {
                  const already = selected.some((s) => s.questionId === q._id);
                  return (
                    <div
                      key={q._id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <MathText as="p" className="line-clamp-2 text-sm" text={q.question} />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={already}
                        onClick={() => void addQuestion(q)}
                      >
                        <LuPlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-sm font-semibold">
              Selected ({selected.length}) · {totalMarks} marks
            </p>
            {selected.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Add questions from the bank.
              </p>
            ) : (
              <div className="max-h-[320px] space-y-2 overflow-y-auto">
                {selected.map((q, index) => (
                  <div
                    key={`${q.questionId}-${index}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm">
                        {index + 1}. <MathText text={q.question} />
                      </p>
                      <Input
                        className="mt-1 h-8 w-24"
                        type="number"
                        min={1}
                        value={q.marks}
                        onChange={(e) => {
                          const marks = Math.max(1, Number(e.target.value) || 1);
                          setSelected((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, marks } : item,
                            ),
                          );
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() =>
                        setSelected((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={saving}
            onClick={() => void saveTest(true)}
          >
            Create & publish
          </Button>
        </div>
      </div>
    </FormModal>
  );
}
