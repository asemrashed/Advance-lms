'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuClock,
  LuLoader,
  LuSave,
  LuX,
} from 'react-icons/lu';
import { MathText } from '@/components/ui/MathText';

type PracticeQuestion = {
  _id: string;
  question: string;
  type: string;
  options: Array<{ text: string }>;
  marks: number;
  order: number;
};

type DraftAnswer = {
  questionId: string;
  selectedOptions: string[];
  writtenAnswer: string;
};

type AttemptData = {
  attemptId: string;
  test: {
    _id: string;
    title: string;
    description?: string;
    durationMinutes: number;
  };
  status: 'in_progress' | 'submitted' | 'pending_review';
  questions: PracticeQuestion[];
  answers: DraftAnswer[];
  currentQuestionIndex: number;
  remainingSeconds: number;
  earnedMarks: number;
  totalMarks: number;
};

export function StudentPracticeTestModal({
  testId,
  open,
  onOpenChange,
}: {
  testId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const answerList = useMemo(() => Object.values(answers), [answers]);

  const postAction = useCallback(
    async (action: 'start' | 'save' | 'submit') => {
      if (!testId) throw new Error('Test is unavailable');
      const response = await fetch(
        `/api/student/practice-tests/${encodeURIComponent(testId)}/attempt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            answers: action === 'start' ? undefined : answerList,
            currentQuestionIndex: currentIndex,
          }),
        },
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to process test');
      }
      return json.data as AttemptData;
    },
    [answerList, currentIndex, testId],
  );

  useEffect(() => {
    if (!open || !testId) return;
    let cancelled = false;
    initializedRef.current = false;
    setLoading(true);
    setError(null);
    setData(null);
    void postAction('start')
      .then((attempt) => {
        if (cancelled) return;
        setData(attempt);
        setAnswers(
          Object.fromEntries(
            attempt.answers.map((answer) => [answer.questionId, answer]),
          ),
        );
        setCurrentIndex(
          Math.min(
            Math.max(0, attempt.currentQuestionIndex || 0),
            Math.max(0, attempt.questions.length - 1),
          ),
        );
        setRemainingSeconds(attempt.remainingSeconds);
        setSaved(true);
        initializedRef.current = true;
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to open test');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, testId]);

  useEffect(() => {
    if (!open || !data || data.status !== 'in_progress') return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data, open]);

  useEffect(() => {
    if (!open || !data || !initializedRef.current || saved) return;
    const timer = window.setTimeout(() => {
      setSaving(true);
      void postAction('save')
        .then(() => setSaved(true))
        .catch((cause) =>
          setError(cause instanceof Error ? cause.message : 'Autosave failed'),
        )
        .finally(() => setSaving(false));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, currentIndex, data, open, postAction, saved]);

  useEffect(() => {
    if (!open || !testId || !data || data.status !== 'in_progress') return;
    const preserveDraft = () => {
      void fetch(
        `/api/student/practice-tests/${encodeURIComponent(testId)}/attempt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            answers: answerList,
            currentQuestionIndex: currentIndex,
          }),
          keepalive: true,
        },
      );
    };
    window.addEventListener('beforeunload', preserveDraft);
    return () => window.removeEventListener('beforeunload', preserveDraft);
  }, [answerList, currentIndex, data, open, testId]);

  const saveAndClose = async () => {
    if (data?.status === 'in_progress' && initializedRef.current) {
      setSaving(true);
      try {
        await postAction('save');
        setSaved(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to save draft');
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    onOpenChange(false);
  };

  const updateAnswer = (questionId: string, patch: Partial<DraftAnswer>) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: {
        questionId,
        selectedOptions: previous[questionId]?.selectedOptions || [],
        writtenAnswer: previous[questionId]?.writtenAnswer || '',
        ...patch,
      },
    }));
    setSaved(false);
  };

  const submit = async () => {
    if (!window.confirm('Submit this test now? You cannot edit this attempt later.')) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await postAction('submit');
      setData(result);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const question = data?.questions[currentIndex];
  const answer = question ? answers[question._id] : undefined;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => void saveAndClose()} />
      <div
        className="relative z-10 flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-950">
              {data?.test.title || 'Practice test'}
            </h2>
            <p className="text-xs text-slate-500">
              {saving ? 'Saving draft…' : saved ? 'Draft saved' : 'Unsaved changes'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data?.status === 'in_progress' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                <LuClock className="h-4 w-4" />
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void saveAndClose()}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Save and close"
            >
              <LuX className="h-5 w-5" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center gap-2 text-slate-500">
            <LuLoader className="h-5 w-5 animate-spin" />
            Loading test…
          </div>
        ) : error && !data ? (
          <div className="min-h-[320px] p-8 text-center text-sm text-red-600">
            {error}
          </div>
        ) : data?.status !== 'in_progress' ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center p-8 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <LuCheck className="h-8 w-8" />
            </span>
            <h3 className="text-2xl font-black text-slate-950">
              {data?.status === 'pending_review'
                ? 'Submitted for review'
                : 'Test submitted'}
            </h3>
            <p className="mt-2 text-slate-600">
              Score: {data?.earnedMarks || 0} / {data?.totalMarks || 0}
            </p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : question ? (
          <>
            <div className="grid min-h-0 flex-1 md:grid-cols-[190px_minmax(0,1fr)]">
              <aside className="overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Questions
                </p>
                <div className="grid grid-cols-5 gap-2 md:grid-cols-4">
                  {data.questions.map((item, index) => {
                    const itemAnswer = answers[item._id];
                    const answered = Boolean(
                      itemAnswer?.selectedOptions.length ||
                        itemAnswer?.writtenAnswer.trim(),
                    );
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => {
                          setCurrentIndex(index);
                          setSaved(false);
                        }}
                        className={`h-9 rounded-lg text-xs font-bold ${
                          index === currentIndex
                            ? 'bg-emerald-700 text-white'
                            : answered
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'border border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="overflow-y-auto p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-emerald-700">
                    Question {currentIndex + 1} of {data.questions.length}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {question.marks} marks
                  </span>
                </div>
                <h3 className="text-lg font-bold leading-7 text-slate-950">
                  <MathText text={question.question} />
                </h3>

                {question.type === 'mcq' || question.type === 'true_false' ? (
                  <div className="mt-6 space-y-3">
                    {question.options.map((option, optionIndex) => {
                      const value = String(optionIndex);
                      const checked = answer?.selectedOptions.includes(value) || false;
                      return (
                        <label
                          key={`${question._id}-${optionIndex}`}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                            checked
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const current = answer?.selectedOptions || [];
                              updateAnswer(question._id, {
                                selectedOptions: checked
                                  ? current.filter((item) => item !== value)
                                  : [...current, value],
                              });
                            }}
                            className="h-4 w-4 accent-emerald-700"
                          />
                          <span className="text-sm font-medium text-slate-800">
                            <MathText text={option.text} />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    className="mt-6 min-h-40 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Write your answer…"
                    value={answer?.writtenAnswer || ''}
                    onChange={(event) =>
                      updateAnswer(question._id, {
                        writtenAnswer: event.target.value,
                      })
                    }
                  />
                )}
                {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
              </main>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <Button
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex((index) => Math.max(0, index - 1));
                  setSaved(false);
                }}
              >
                <LuArrowLeft className="mr-1.5 h-4 w-4" />
                Previous
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => void saveAndClose()}
                >
                  <LuSave className="mr-1.5 h-4 w-4" />
                  Save & close
                </Button>
                {currentIndex < data.questions.length - 1 ? (
                  <Button
                    onClick={() => {
                      setCurrentIndex((index) =>
                        Math.min(data.questions.length - 1, index + 1),
                      );
                      setSaved(false);
                    }}
                  >
                    Next
                    <LuArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <Button disabled={submitting} onClick={() => void submit()}>
                    {submitting ? 'Submitting…' : 'Submit test'}
                  </Button>
                )}
              </div>
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
}
