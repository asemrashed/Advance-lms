'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuBookOpen, LuCheck, LuChevronLeft, LuChevronRight, LuPlus, LuX } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import BorrowFromPlatformModal from '@/components/platform-question-bank/BorrowFromPlatformModal';
import { MathText } from '@/components/ui/MathText';
import { cn } from '@/lib/utils';

type BankQuestion = {
  _id: string;
  question: string;
  type: string;
  marks: number;
  difficulty: string;
  topic?: string;
  options?: Array<{ text: string }>;
  isSharedPlatform?: boolean;
  alreadyOnExam?: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

interface Props {
  open: boolean;
  examId: string;
  subject?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExamQuestionBankModal({
  open,
  examId,
  subject,
  onClose,
  onSuccess,
}: Props) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [subjectName, setSubjectName] = useState(subject || 'this subject');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedMarksById, setSelectedMarksById] = useState<Record<string, number>>({});
  const [selectedMeta, setSelectedMeta] = useState<Record<string, BankQuestion>>({});
  const [examSelection, setExamSelection] = useState({ count: 0, marks: 0 });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [showBorrow, setShowBorrow] = useState(false);

  const loadQuestions = useCallback(
    async (nextTopic?: string, nextPage = 1) => {
      if (!examId) return;
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: '50',
        });
        if (nextTopic) params.set('topic', nextTopic);
        const response = await fetch(
          `/api/exams/${examId}/questions/from-bank?${params.toString()}`,
          { credentials: 'include' },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setQuestions([]);
          setTopics([]);
          setError(data.error || 'Could not load the question bank');
          return;
        }
        const payload = data.data || {};
        const nextTopics: string[] = Array.isArray(payload.topics) ? payload.topics : [];
        const resolvedTopic = String(payload.topic || nextTopic || nextTopics[0] || '');
        setTopics(nextTopics);
        setTopic(resolvedTopic);
        setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
        setSubjectName(payload.subject || subject || 'this subject');
        setExamSelection({
          count: Number(payload.examSelection?.count || 0),
          marks: Number(payload.examSelection?.marks || 0),
        });
        setPagination(
          payload.pagination || {
            page: nextPage,
            limit: 50,
            total: 0,
            pages: 0,
          },
        );
      } catch {
        setQuestions([]);
        setTopics([]);
        setError('Could not load the question bank');
      } finally {
        setLoading(false);
      }
    },
    [examId, subject],
  );

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSelectedMarksById({});
      setSelectedMeta({});
      setExamSelection({ count: 0, marks: 0 });
      setError('');
      setShowBorrow(false);
      setTopic('');
      setTopics([]);
      setQuestions([]);
      return;
    }
    void loadQuestions(undefined, 1);
  }, [open, loadQuestions]);

  useEffect(() => {
    setSelectedMeta((prev) => {
      const next = { ...prev };
      for (const q of questions) {
        if (selected.has(q._id)) next[q._id] = q;
      }
      for (const id of Object.keys(next)) {
        if (!selected.has(id)) delete next[id];
      }
      return next;
    });
  }, [questions, selected]);

  const selectableQuestions = useMemo(
    () => questions.filter((q) => !q.alreadyOnExam),
    [questions],
  );

  const newSelectedCount = selected.size;
  const newSelectedMarks = useMemo(
    () => Object.values(selectedMarksById).reduce((sum, marks) => sum + Number(marks || 0), 0),
    [selectedMarksById],
  );
  const totalSelectedCount = examSelection.count + newSelectedCount;
  const totalSelectedMarks = examSelection.marks + newSelectedMarks;

  const alreadyOnPage = useMemo(
    () => questions.filter((q) => q.alreadyOnExam).length,
    [questions],
  );

  const allSelectableSelected = useMemo(
    () =>
      selectableQuestions.length > 0 &&
      selectableQuestions.every((question) => selected.has(question._id)),
    [selectableQuestions, selected],
  );

  const selectedList = useMemo(() => {
    return Array.from(selected).map((id) => {
      return (
        selectedMeta[id] ||
        questions.find((q) => q._id === id) ||
        ({
          _id: id,
          question: 'Selected question',
          type: 'written',
          marks: selectedMarksById[id] || 1,
          difficulty: 'medium',
        } as BankQuestion)
      );
    });
  }, [selected, selectedMeta, questions, selectedMarksById]);

  const toggleQuestion = (question: BankQuestion) => {
    if (question.alreadyOnExam) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(question._id)) next.delete(question._id);
      else next.add(question._id);
      return next;
    });
    setSelectedMarksById((current) => {
      const next = { ...current };
      if (next[question._id] != null) delete next[question._id];
      else next[question._id] = Number(question.marks || 0);
      return next;
    });
    setSelectedMeta((current) => {
      const next = { ...current };
      if (next[question._id]) delete next[question._id];
      else next[question._id] = question;
      return next;
    });
  };

  const removeSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setSelectedMarksById((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSelectedMeta((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelectableSelected) {
      setSelected((current) => {
        const next = new Set(current);
        for (const q of selectableQuestions) next.delete(q._id);
        return next;
      });
      setSelectedMarksById((current) => {
        const next = { ...current };
        for (const q of selectableQuestions) delete next[q._id];
        return next;
      });
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      for (const q of selectableQuestions) next.add(q._id);
      return next;
    });
    setSelectedMarksById((current) => {
      const next = { ...current };
      for (const q of selectableQuestions) next[q._id] = Number(q.marks || 0);
      return next;
    });
    setSelectedMeta((current) => {
      const next = { ...current };
      for (const q of selectableQuestions) next[q._id] = q;
      return next;
    });
  };

  const changeTopic = (nextTopic: string) => {
    void loadQuestions(nextTopic, 1);
  };

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || (pagination.pages > 0 && nextPage > pagination.pages)) return;
    void loadQuestions(topic, nextPage);
  };

  const addSelected = async () => {
    if (!newSelectedCount) return;
    setAdding(true);
    setError('');
    try {
      const response = await fetch(`/api/exams/${examId}/questions/from-bank`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: Array.from(selected) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Could not add the selected questions');
        return;
      }
      onSuccess();
    } catch {
      setError('Could not add the selected questions');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !adding && onClose()}>
        <DialogContent
          className={cn(
            'flex max-h-[90vh] w-[min(100%,90vw)] max-w-[90vw] flex-col gap-0 overflow-hidden p-0',
          )}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>Add from Question Bank</DialogTitle>
            <DialogDescription>
              Showing questions for <strong>{subjectName}</strong>. Filter by topic and select
              questions to add. Selected questions stay on the right when you switch topics.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            {topics.length > 0 ? (
              <div className="shrink-0 border-b px-5 py-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Topic
                </p>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {topics.map((item) => {
                    const active = item === topic;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => changeTopic(item)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground hover:bg-muted'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 md:grid-cols-2">
              <div className="flex min-h-0 flex-col rounded-xl border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Question bank</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {loading
                        ? 'Loading…'
                        : `${pagination.total} in topic${
                            alreadyOnPage > 0 ? ` · ${alreadyOnPage} on exam` : ''
                          }`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={toggleAll}
                      disabled={selectableQuestions.length === 0}
                    >
                      {allSelectableSelected ? 'Clear page' : 'Select page'}
                    </Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {loading ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Loading questions…
                    </p>
                  ) : error && questions.length === 0 ? (
                    <p className="py-10 text-center text-sm text-destructive">{error}</p>
                  ) : questions.length === 0 ? (
                    <div className="py-10 text-center">
                      <LuBookOpen className="mx-auto h-9 w-9 text-muted-foreground" />
                      <p className="mt-3 font-medium">
                        {topics.length === 0
                          ? `No question on '${subjectName}' subject`
                          : `No questions in topic '${topic || 'selected'}'`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {topics.length === 0
                          ? "Borrow this subject's question bank from the platform to add questions."
                          : 'Try another topic, or borrow more questions from the platform.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {questions.map((question) => {
                        const already = Boolean(question.alreadyOnExam);
                        const checked = already || selected.has(question._id);
                        return (
                          <div
                            key={question._id}
                            className={`rounded-xl border p-3 ${
                              already
                                ? 'border-emerald-200 bg-emerald-50/70'
                                : checked
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border'
                            }`}
                          >
                            <p className="line-clamp-2 text-sm font-medium">
                              <MathText text={question.question} />
                            </p>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="flex flex-wrap gap-1.5">
                                {already ? (
                                  <Badge className="bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
                                    On exam
                                  </Badge>
                                ) : null}
                                <Badge variant="outline" className="text-[10px]">
                                  {question.type.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {question.marks} marks
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {question.difficulty}
                                </Badge>
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant={checked ? 'secondary' : 'outline'}
                                disabled={already || checked}
                                onClick={() => toggleQuestion(question)}
                              >
                                {already || checked ? (
                                  <>
                                    <LuCheck className="mr-1 h-3.5 w-3.5" />
                                    {already ? 'On exam' : 'Added'}
                                  </>
                                ) : (
                                  <>
                                    <LuPlus className="mr-1 h-3.5 w-3.5" />
                                    Add
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {pagination.pages > 1 ? (
                  <div className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t pt-2">
                    <p className="text-xs text-muted-foreground">
                      Page {pagination.page} of {pagination.pages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loading || pagination.page <= 1}
                        onClick={() => changePage(pagination.page - 1)}
                      >
                        <LuChevronLeft className="h-4 w-4" />
                        Prev
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loading || pagination.page >= pagination.pages}
                        onClick={() => changePage(pagination.page + 1)}
                      >
                        Next
                        <LuChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex min-h-0 flex-col rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Selected / overview</p>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {totalSelectedCount} Q · {totalSelectedMarks} marks
                  </span>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {examSelection.count} already on exam
                  {newSelectedCount > 0 ? ` · +${newSelectedCount} new` : ''}
                </p>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {selectedList.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                      Add questions from the bank
                    </p>
                  ) : (
                    selectedList.map((question, index) => (
                      <div key={question._id} className="rounded-xl border border-border p-3">
                        <p className="line-clamp-2 text-sm font-medium">
                          {index + 1}. <MathText text={question.question} />
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {question.type.replace('_', ' ')} · {question.marks} marks
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeSelected(question._id)}
                          >
                            <LuX className="mr-1 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {error && questions.length > 0 ? (
              <p className="mx-5 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
              <Button variant="outline" onClick={() => setShowBorrow(true)}>
                Borrow QB from platform
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                {totalSelectedCount > 0 ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalSelectedCount} Q · {totalSelectedMarks} marks
                    {newSelectedCount > 0 ? ` (+${newSelectedCount} new)` : ''}
                  </span>
                ) : null}
                <Button variant="ghost" disabled={adding} onClick={onClose}>
                  Cancel
                </Button>
                <Button disabled={!newSelectedCount || adding} onClick={() => void addSelected()}>
                  {adding
                    ? 'Adding…'
                    : `Add selected${newSelectedCount ? ` (${newSelectedCount})` : ''}`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BorrowFromPlatformModal
        open={showBorrow}
        onClose={() => setShowBorrow(false)}
        onSubmitted={() => void loadQuestions(topic || undefined, 1)}
      />
    </>
  );
}
