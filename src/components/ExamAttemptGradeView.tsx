'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MathText, RichHtml } from '@/components/ui/MathText';
import ConfirmModal from '@/components/ui/confirm-modal';
import { htmlToPlainText } from '@/lib/utils';
import {
  LuArrowLeft as ArrowLeft,
  LuUser as User,
  LuCalendar as Calendar,
  LuTarget as Target,
  LuDownload as Download,
  LuTrash2 as Trash2,
  LuSave as Save,
  LuSparkles as Sparkles,
} from 'react-icons/lu';

type Variant = 'admin' | 'instructor';

type QuestionItem = {
  questionId: string;
  question: string;
  type: string;
  marks: number;
  options: Array<{ index: string; text: string; isCorrect: boolean }>;
  studentSelected: string[];
  studentWritten: string;
  correctAnswer?: string;
  marksObtained: number;
  isCorrect?: boolean;
  gradingStatus?: string;
};

function isManualQuestionType(type: string) {
  return type === 'written' || type === 'essay' || type === 'fill_blank';
}

function isAutoQuestionType(type: string) {
  return type === 'mcq' || type === 'true_false';
}

function clampMarks(value: number, max: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(max, value));
}

/** Normalize student/model answers for exact auto-mark comparison. */
function normalizeAnswer(value?: string | null) {
  return htmlToPlainText(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasFixedAnswer(q: QuestionItem) {
  return Boolean(normalizeAnswer(q.correctAnswer));
}

export default function ExamAttemptGradeView({ variant }: { variant: Variant }) {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const attemptId = params.attemptId as string;

  const apiBase = variant === 'admin' ? '/api/exams' : '/api/instructor/exams';
  const attemptsListPath =
    variant === 'admin' ? `/admin/exams/${examId}/attempts` : `/instructor/exams/${examId}/attempts`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoMarking, setAutoMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [attempt, setAttempt] = useState<{
    status: string;
    student: { name: string; email: string };
    percentage?: number;
    marksObtained?: number;
    totalMarks?: number;
    isPassed?: boolean;
    submittedAt?: string;
    attemptNumber?: number;
  } | null>(null);
  const [manualMarks, setManualMarks] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const hasManualQuestions = useMemo(
    () => questions.some((q) => isManualQuestionType(q.type)),
    [questions],
  );

  const fixedAnswerCount = useMemo(
    () => questions.filter((q) => isManualQuestionType(q.type) && hasFixedAnswer(q)).length,
    [questions],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/${examId}/attempts/${attemptId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setQuestions([]);
        setAttempt(null);
        return;
      }
      const payload = data.data;
      setExamTitle(payload?.exam?.title || '');
      setAttempt(payload?.attempt || null);
      const qs: QuestionItem[] = Array.isArray(payload?.questions) ? payload.questions : [];
      setQuestions(qs);
      const init: Record<string, string> = {};
      for (const q of qs) {
        if (isManualQuestionType(q.type)) {
          init[q.questionId] = String(
            typeof q.marksObtained === 'number' ? q.marksObtained : '',
          );
        }
      }
      setManualMarks(init);
    } finally {
      setLoading(false);
    }
  }, [apiBase, examId, attemptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownloadJson = () => {
    const blob = new Blob(
      [JSON.stringify({ examId, attemptId, attempt, questions }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-attempt-${attemptId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attemptGradable = Boolean(
    attempt && (attempt.status === 'completed' || attempt.status === 'pending_review'),
  );

  const saveAnswerGrades = async (answerGrades: Array<{ questionId: string; marksObtained: number }>) => {
    const res = await fetch(`${apiBase}/${examId}/attempts/${attemptId}/grade`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerGrades }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save grades');
    }
    if (data.data?.attempt) {
      setAttempt((prev) =>
        prev
          ? {
              ...prev,
              marksObtained: data.data.attempt.marksObtained,
              percentage: data.data.attempt.percentage,
              isPassed: data.data.attempt.isPassed,
              status: data.data.attempt.status || prev.status,
            }
          : prev,
      );
    }
    await load();
  };

  const buildAnswerGrades = (marksOverride?: Record<string, string>) => {
    const marksMap = marksOverride || manualMarks;
    return questions.map((q) => {
      const max = Number(q.marks || 0);
      if (isManualQuestionType(q.type)) {
        const raw = parseFloat(marksMap[q.questionId] ?? '');
        return { questionId: q.questionId, marksObtained: clampMarks(raw, max) };
      }
      return {
        questionId: q.questionId,
        marksObtained: clampMarks(Number(q.marksObtained) || 0, max),
      };
    });
  };

  const handleSaveGrades = async () => {
    if (!attemptGradable || questions.length === 0) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await saveAnswerGrades(buildAnswerGrades());
      setNotice('Grades saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoMark = async () => {
    if (!attemptGradable || questions.length === 0) return;
    setAutoMarking(true);
    setError('');
    setNotice('');
    try {
      const nextMarks: Record<string, string> = { ...manualMarks };
      let fixedMarked = 0;
      let matched = 0;
      let skippedNoModel = 0;

      for (const q of questions) {
        if (!isManualQuestionType(q.type)) continue;
        if (!hasFixedAnswer(q)) {
          skippedNoModel += 1;
          continue;
        }
        const max = Number(q.marks || 0);
        const studentNorm = normalizeAnswer(q.studentWritten);
        const modelNorm = normalizeAnswer(q.correctAnswer);
        const ok = Boolean(studentNorm) && studentNorm === modelNorm;
        nextMarks[q.questionId] = String(ok ? max : 0);
        fixedMarked += 1;
        if (ok) matched += 1;
      }

      setManualMarks(nextMarks);
      await saveAnswerGrades(buildAnswerGrades(nextMarks));

      if (fixedMarked === 0) {
        setNotice(
          'No fixed model answers found. Add a model/correct answer on written questions to auto-mark them.',
        );
      } else {
        setNotice(
          `Auto-marked ${fixedMarked} fixed-answer question${fixedMarked === 1 ? '' : 's'} (${matched} exact match${matched === 1 ? '' : 'es'}).` +
            (skippedNoModel
              ? ` ${skippedNoModel} written question${skippedNoModel === 1 ? '' : 's'} still need manual marks.`
              : ''),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-mark failed');
    } finally {
      setAutoMarking(false);
    }
  };

  const handleDelete = async () => {
    if (variant !== 'admin') return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/${examId}/attempts/${attemptId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        router.push(attemptsListPath);
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const main = (
    <main className="relative z-10 p-2 sm:p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => router.push(attemptsListPath)}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to attempts
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadJson} type="button">
          <Download className="w-4 h-4 mr-2" />
          Download JSON
        </Button>
        {attemptGradable && (
          <Button
            size="sm"
            type="button"
            disabled={autoMarking || saving || loading}
            onClick={() => void handleAutoMark()}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {autoMarking
              ? 'Auto-marking…'
              : `Auto-mark${fixedAnswerCount ? ` (${fixedAnswerCount})` : ''}`}
          </Button>
        )}
        {variant === 'admin' && (
          <Button
            variant="destructive"
            size="sm"
            type="button"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete attempt
          </Button>
        )}
      </div>

      <WelcomeSection
        title={examTitle ? `Grade — ${examTitle}` : 'Exam attempt'}
        description="Compare the student answer with the model answer, then award marks. Use Auto-mark when a fixed correct answer is set."
      />

      {notice ? (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <PageSection title="Overview" className="mb-4">
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5 text-blue-600" />
              {attempt?.student?.name || 'Student'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                Submitted:{' '}
                {attempt?.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '—'}
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4 text-gray-500" />
                Attempt #{attempt?.attemptNumber ?? '—'}
              </span>
              <Badge variant="outline">{attempt?.status || '—'}</Badge>
            </div>
            <div>
              Score:{' '}
              {attemptGradable && attempt ? (
                <>
                  {Number(attempt.marksObtained ?? 0).toFixed(1)} /{' '}
                  {Number(attempt.totalMarks ?? 0)} ({Number(attempt.percentage ?? 0).toFixed(1)}%)
                  <span className="ml-2">
                    {attempt.isPassed ? (
                      <Badge className="bg-green-100 text-green-800">Passed</Badge>
                    ) : (
                      <Badge variant="secondary">Not passed</Badge>
                    )}
                  </span>
                </>
              ) : (
                '—'
              )}
            </div>
            {attempt?.status === 'in_progress' && (
              <p className="text-amber-700">
                This attempt is still in progress and cannot be graded yet.
              </p>
            )}
            {fixedAnswerCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {fixedAnswerCount} written/fill-blank question
                {fixedAnswerCount === 1 ? ' has' : 's have'} a fixed model answer and can be
                auto-marked.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="Questions" className="mb-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => {
              const selected = new Set((q.studentSelected || []).map(String));
              const model = String(q.correctAnswer || '').trim();
              return (
                <Card key={q.questionId} className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium text-gray-900 leading-snug">
                        <MathText text={q.question} />
                      </CardTitle>
                      <div className="flex gap-2 shrink-0">
                        <Badge variant="outline" className="capitalize">
                          {q.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary">Max {q.marks} marks</Badge>
                        {isManualQuestionType(q.type) && model ? (
                          <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">
                            Fixed answer
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {isAutoQuestionType(q.type) && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {typeof q.isCorrect === 'boolean' &&
                            (q.isCorrect ? (
                              <Badge className="bg-green-100 text-green-800">Correct</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">Incorrect</Badge>
                            ))}
                          <Badge variant="outline">
                            Awarded: {Number(q.marksObtained ?? 0).toFixed(1)}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {q.options?.map((opt) => {
                            const sel = selected.has(String(opt.index));
                            return (
                              <div
                                key={opt.index}
                                className={`rounded-md border px-2 py-1.5 ${
                                  sel ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'
                                } ${opt.isCorrect ? 'ring-1 ring-green-200' : ''}`}
                              >
                                <MathText as="span" className="text-gray-800" text={opt.text} />
                                {opt.isCorrect && (
                                  <span className="ml-2 text-xs text-green-700">(correct)</span>
                                )}
                                {sel && (
                                  <span className="ml-2 text-xs text-blue-700">(selected)</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {isManualQuestionType(q.type) && (
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Student answer
                            </p>
                            <div className="min-h-[4.5rem] rounded-md border border-border bg-muted/30 p-3 text-foreground">
                              {q.studentWritten?.trim() ? (
                                <RichHtml className="text-sm" html={q.studentWritten} />
                              ) : (
                                <span className="italic text-muted-foreground">
                                  No written answer
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Model / correct answer
                            </p>
                            <div className="min-h-[4.5rem] rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-foreground">
                              {model ? (
                                <RichHtml className="text-sm" html={model} />
                              ) : (
                                <span className="italic text-muted-foreground">
                                  No model answer set on this question — mark manually.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="block text-xs font-medium text-gray-600">
                            Marks obtained
                            <Input
                              type="number"
                              min={0}
                              max={q.marks}
                              step={0.5}
                              className="mt-1 w-32"
                              disabled={!attemptGradable}
                              value={manualMarks[q.questionId] ?? ''}
                              onChange={(e) =>
                                setManualMarks((prev) => ({
                                  ...prev,
                                  [q.questionId]: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <span className="pb-2 text-xs text-gray-500">of {q.marks}</span>
                          {model &&
                          normalizeAnswer(q.studentWritten) &&
                          normalizeAnswer(q.studentWritten) === normalizeAnswer(model) ? (
                            <Badge className="mb-1 bg-green-100 text-green-800">
                              Matches model
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {!isAutoQuestionType(q.type) && !isManualQuestionType(q.type) && (
                      <p className="text-gray-500">Unsupported question type for this view.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageSection>

      {attemptGradable && questions.length > 0 && (
        <PageSection title="Save grades" className="mb-8">
          <p className="mb-3 text-sm text-gray-600">
            {hasManualQuestions
              ? 'Review student vs model answers, adjust marks if needed, then save. Auto-mark fills marks for questions that have a fixed correct answer.'
              : 'All questions are auto-scored. Saving re-syncs totals with the server.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handleAutoMark()}
              disabled={autoMarking || saving}
              type="button"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {autoMarking ? 'Auto-marking…' : 'Auto-mark fixed answers'}
            </Button>
            <Button onClick={() => void handleSaveGrades()} disabled={saving || autoMarking} type="button">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save grades'}
            </Button>
          </div>
        </PageSection>
      )}

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete attempt"
        description="This permanently removes the student attempt. Continue?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </main>
  );

  if (variant === 'admin') {
    return <AdminRoleShell>{main}</AdminRoleShell>;
  }
  return <InstructorRoleShell>{main}</InstructorRoleShell>;
}
