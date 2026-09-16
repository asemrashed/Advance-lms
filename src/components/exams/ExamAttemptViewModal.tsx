'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ExamAttemptRow } from '@/components/ExamAttemptDataTable';
import { MathText } from '@/components/ui/MathText';

type QuestionItem = {
  questionId: string;
  question: string;
  type: string;
  marks: number;
  options: Array<{ index: string; text: string; isCorrect: boolean }>;
  studentSelected: string[];
  studentWritten: string;
  marksObtained: number;
  isCorrect?: boolean;
};

type Props = {
  open: boolean;
  examId: string;
  attempt: ExamAttemptRow | null;
  apiBase?: '/api/exams' | '/api/instructor/exams';
  onClose: () => void;
};

function isAutoQuestionType(type: string) {
  return type === 'mcq' || type === 'true_false';
}

export default function ExamAttemptViewModal({
  open,
  examId,
  attempt,
  apiBase = '/api/instructor/exams',
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [meta, setMeta] = useState<{
    studentName: string;
    status: string;
    submittedAt?: string;
    attemptNumber?: number;
    marksObtained?: number;
    totalMarks?: number;
    percentage?: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!open || !attempt?._id || !examId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/${examId}/attempts/${attempt._id}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQuestions([]);
        setMeta(null);
        setError(data.error || 'Could not load attempt');
        return;
      }
      const payload = data.data;
      setExamTitle(payload?.exam?.title || '');
      setQuestions(Array.isArray(payload?.questions) ? payload.questions : []);
      setMeta({
        studentName: payload?.attempt?.student?.name || attempt.student?.name || 'Student',
        status: payload?.attempt?.status || attempt.status || '—',
        submittedAt: payload?.attempt?.submittedAt,
        attemptNumber: payload?.attempt?.attemptNumber,
        marksObtained: payload?.attempt?.marksObtained,
        totalMarks: payload?.attempt?.totalMarks,
        percentage: payload?.attempt?.percentage,
      });
    } catch {
      setError('Could not load attempt');
      setQuestions([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase, attempt, examId, open]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="View attempt"
      description={examTitle || 'Student answers (read-only)'}
      size="xl"
      showCancelButton={false}
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading attempt…</p>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{meta?.studentName}</span>
              <Badge variant="outline" className="capitalize">
                {String(meta?.status || '').replace('_', ' ')}
              </Badge>
              {meta?.attemptNumber != null ? (
                <Badge variant="secondary">Attempt #{meta.attemptNumber}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-muted-foreground">
              Submitted:{' '}
              {meta?.submittedAt ? new Date(meta.submittedAt).toLocaleString() : '—'}
              {typeof meta?.marksObtained === 'number' && typeof meta?.totalMarks === 'number'
                ? ` · Score ${meta.marksObtained}/${meta.totalMarks}`
                : ''}
              {typeof meta?.percentage === 'number' ? ` (${meta.percentage.toFixed(1)}%)` : ''}
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, index) => {
              const selected = new Set((q.studentSelected || []).map(String));
              return (
                <div key={q.questionId} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      <span className="mr-1 text-muted-foreground">Q{index + 1}.</span>
                      <MathText text={q.question} />
                    </p>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {q.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {q.marks} marks
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Student answer
                    </p>
                    {isAutoQuestionType(q.type) ? (
                      <div className="space-y-1">
                        {(q.options || []).map((opt) => {
                          const sel = selected.has(String(opt.index));
                          return (
                            <div
                              key={opt.index}
                              className={`rounded-md border px-2.5 py-1.5 text-sm ${
                                sel
                                  ? 'border-primary/40 bg-primary/5 font-medium text-foreground'
                                  : 'border-transparent bg-muted/40 text-muted-foreground'
                              }`}
                            >
                              <MathText text={opt.text} />
                              {sel ? (
                                <span className="ml-2 text-xs text-primary">(selected)</span>
                              ) : null}
                            </div>
                          );
                        })}
                        {selected.size === 0 ? (
                          <p className="text-sm italic text-muted-foreground">No option selected</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
                        {q.studentWritten?.trim() || (
                          <span className="italic text-muted-foreground">No written answer</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {questions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No questions found.</p>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}
