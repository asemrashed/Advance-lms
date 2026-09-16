'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { questionsStaffService } from '@/services/questionsStaffService';
import { resourceScopeService } from '@/services/resourceScopeService';
import type { AssignmentMcqQuestion } from '@/types/assignment';
import { LuLibrary, LuSearch } from 'react-icons/lu';
import BorrowFromPlatformModal from '@/components/platform-question-bank/BorrowFromPlatformModal';
import { MathText } from '@/components/ui/MathText';

type BankOption = { text?: string; isCorrect?: boolean };

type BankQuestion = {
  _id: string;
  question: string;
  type: string;
  marks?: number;
  options?: BankOption[];
};

export type AssignmentBankTextQuestion = {
  id: string;
  question: string;
  type: string;
  marks: number;
  options: string[];
};

export function cleanText(input: string): string {
  return input
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isTextQuestionInInstructions(questionText: string, instructionsHtml: string): boolean {
  if (!questionText || !instructionsHtml) return false;
  const qClean = cleanText(questionText);
  if (!qClean) return false;
  const htmlClean = cleanText(instructionsHtml);
  return htmlClean.includes(qClean);
}

type AssignmentQuestionBankPickerProps = {
  role: 'admin' | 'instructor';
  courseId?: string;
  subjectId?: string;
  subjectLabel?: string;
  /** Chapter/topic to filter questions (curriculum or manual selection). */
  chapterId?: string;
  chapterLabel?: string;
  /**
   * When true (curriculum), chapter is fixed from the lesson's chapter.
   * When false and a course is selected, show a chapter filter dropdown.
   */
  lockChapterFilter?: boolean;
  mode?: 'mcq' | 'text';
  onImport?: (questions: AssignmentMcqQuestion[]) => void;
  onInsertText?: (questions: AssignmentBankTextQuestion[]) => void;
  existingInstructions?: string;
  existingMcqQuestions?: AssignmentMcqQuestion[];
  onToggleTextQuestion?: (question: AssignmentBankTextQuestion, checked: boolean) => void;
  onToggleMcqQuestion?: (question: AssignmentMcqQuestion, checked: boolean) => void;
  disabled?: boolean;
};

/** Maps a question-bank MCQ into the embedded assignment MCQ shape. */
function toAssignmentMcq(q: BankQuestion, index: number): AssignmentMcqQuestion | null {
  const optionsWithAnswers = (q.options ?? [])
    .map((option) => ({
      text: String(option.text ?? '').trim(),
      isCorrect: Boolean(option.isCorrect),
    }))
    .filter((option) => option.text.length > 0);
  if (optionsWithAnswers.length < 2) return null;
  const options = optionsWithAnswers.map((option) => option.text);
  const matchedCorrectIndex = optionsWithAnswers.findIndex((option) => option.isCorrect);
  const correctOptionIndex = matchedCorrectIndex >= 0 ? matchedCorrectIndex : 0;
  return {
    id: `qb-${q._id}-${Date.now()}-${index}`,
    question: q.question,
    options,
    correctOptionIndex,
    marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
  };
}

function toAssignmentTextQuestion(q: BankQuestion): AssignmentBankTextQuestion | null {
  const question = String(q.question || '').trim();
  if (!question) return null;
  return {
    id: q._id,
    question,
    type: q.type,
    marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
    options: (q.options ?? [])
      .map((option) => String(option.text ?? '').trim())
      .filter(Boolean),
  };
}

export function AssignmentQuestionBankPicker({
  role,
  courseId,
  subjectId,
  subjectLabel,
  chapterId: lockedChapterId,
  chapterLabel: lockedChapterLabel,
  lockChapterFilter = false,
  mode = 'mcq',
  onImport,
  onInsertText,
  existingInstructions,
  existingMcqQuestions,
  onToggleTextQuestion,
  onToggleMcqQuestion,
  disabled = false,
}: AssignmentQuestionBankPickerProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [chapters, setChapters] = useState<{ _id: string; label: string }[]>([]);
  const [pickedChapterId, setPickedChapterId] = useState('');

  const filterChapterId = lockChapterFilter
    ? lockedChapterId || ''
    : pickedChapterId || lockedChapterId || '';

  const filterChapterLabel = useMemo(() => {
    if (lockChapterFilter) return lockedChapterLabel || '';
    const fromList = chapters.find((c) => c._id === filterChapterId)?.label;
    return fromList || lockedChapterLabel || '';
  }, [
    lockChapterFilter,
    lockedChapterLabel,
    chapters,
    filterChapterId,
  ]);

  useEffect(() => {
    if (lockChapterFilter || !courseId) {
      setChapters([]);
      setPickedChapterId('');
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await resourceScopeService.listChapters(courseId);
      if (cancelled) return;
      setChapters(rows);
      setPickedChapterId((prev) =>
        prev && rows.some((r) => r._id === prev) ? prev : '',
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [lockChapterFilter, courseId]);

  const fetchQuestions = useCallback(async () => {
    if (!courseId && !subjectId && !subjectLabel) {
      setQuestions([]);
      setManualSelectedIds([]);
      return;
    }

    // Standalone assignment flow: wait until a chapter/topic is chosen (UI filter only).
    // Curriculum-scoped assignments load by subject name (same as Course QB).
    if (!lockChapterFilter && courseId && !filterChapterId && !subjectLabel) {
      setQuestions([]);
      setManualSelectedIds([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        status: 'active',
      });
      if (mode === 'mcq') params.set('type', 'mcq');

      const subjectName = (subjectLabel || '').replace(/\s+\d{3,5}\s*$/, '').trim();
      if (subjectName) {
        // Match Course Question Bank — do not filter by curriculum chapter ObjectId
        // (QB topics like "3D Trigonometry" won't match chapter titles).
        params.set('subjectName', subjectName);
      } else if (courseId) {
        params.set('course', courseId);
        if (filterChapterId) params.set('chapter', filterChapterId);
      } else if (subjectId) {
        params.set('subject', subjectId);
      }

      if (search.trim()) params.set('search', search.trim());
      const res = await questionsStaffService.listQuestionBank(role, params.toString());
      const json = (await res.json()) as { data?: { questions?: BankQuestion[] } };
      setQuestions(Array.isArray(json.data?.questions) ? json.data!.questions! : []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [
    role,
    courseId,
    mode,
    search,
    subjectId,
    subjectLabel,
    lockChapterFilter,
    filterChapterId,
  ]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    // Only clear selection when the assignment scope changes (course/subject),
    // not when the user switches chapters/topics inside the same assignment.
    setManualSelectedIds([]);
  }, [courseId, subjectId]);

  const cleanedInstructions = useMemo(() => {
    if (mode !== 'text' || !existingInstructions) return '';
    return cleanText(existingInstructions);
  }, [mode, existingInstructions]);

  const mcqSet = useMemo(() => {
    if (mode !== 'mcq' || !existingMcqQuestions || existingMcqQuestions.length === 0) {
      return new Set<string>();
    }
    const set = new Set<string>();
    for (const m of existingMcqQuestions) {
      if (m.id) set.add(m.id);
      if (m.question) {
        const qClean = cleanText(m.question);
        if (qClean) set.add(qClean);
      }
    }
    return set;
  }, [mode, existingMcqQuestions]);

  const selectedSet = useMemo(() => {
    const set = new Set<string>(manualSelectedIds);
    if (mode === 'text' && cleanedInstructions) {
      for (const q of questions) {
        if (!q.question) continue;
        const qClean = cleanText(q.question);
        if (qClean && cleanedInstructions.includes(qClean)) {
          set.add(q._id);
        }
      }
    } else if (mode === 'mcq' && mcqSet.size > 0) {
      for (const q of questions) {
        if (mcqSet.has(q._id)) {
          set.add(q._id);
        } else if (q.question) {
          const qClean = cleanText(q.question);
          if (qClean && mcqSet.has(qClean)) {
            set.add(q._id);
          }
        }
      }
    }
    return set;
  }, [questions, mode, cleanedInstructions, mcqSet, manualSelectedIds]);

  const selectedIds = useMemo(() => Array.from(selectedSet), [selectedSet]);

  const importableIds = useMemo(
    () =>
      new Set(
        questions
          .filter((q) =>
            mode === 'mcq'
              ? toAssignmentMcq(q, 0) !== null
              : toAssignmentTextQuestion(q) !== null,
          )
          .map((q) => q._id),
      ),
    [mode, questions],
  );

  const toggle = (q: BankQuestion, checked: boolean) => {
    if (checked) {
      setManualSelectedIds((prev) => [...prev, q._id]);
    } else {
      setManualSelectedIds((prev) => prev.filter((x) => x !== q._id));
    }

    if (mode === 'text') {
      const textQ = toAssignmentTextQuestion(q);
      if (textQ) {
        onToggleTextQuestion?.(textQ, checked);
      }
    } else {
      const mcqQ = toAssignmentMcq(q, 0);
      if (mcqQ) {
        onToggleMcqQuestion?.(mcqQ, checked);
      }
    }
  };

  const handleImport = () => {
    if (mode === 'text') {
      const mapped = questions
        .filter((q) => selectedSet.has(q._id))
        .map(toAssignmentTextQuestion)
        .filter((q): q is AssignmentBankTextQuestion => q !== null);
      if (mapped.length === 0) return;
      onInsertText?.(mapped);
      setManualSelectedIds([]);
      return;
    }

    const mapped = questions
      .filter((q) => selectedSet.has(q._id))
      .map((q, i) => toAssignmentMcq(q, i))
      .filter((q): q is AssignmentMcqQuestion => q !== null);
    if (mapped.length === 0) return;
    onImport?.(mapped);
    setManualSelectedIds([]);
  };

  const scopeLine = [subjectLabel, filterChapterLabel].filter(Boolean).join(' · ');
  const needsChapterPick =
    Boolean(courseId) && !lockChapterFilter && !filterChapterId && !subjectLabel;

  const selectedQuestions = useMemo(
    () => questions.filter((q) => selectedSet.has(q._id)),
    [questions, selectedSet],
  );

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          {mode === 'text' ? 'Add questions from Question Bank' : 'Import from Question Bank'}
        </p>
        {scopeLine ? (
          <p className="mt-1 text-xs font-medium text-foreground/80">{scopeLine}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Add questions from the bank on the left. Selected questions appear on the right.
        </p>
      </div>

      {!lockChapterFilter && courseId && !subjectLabel ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Chapter / topic</p>
          <Select
            value={pickedChapterId || undefined}
            onValueChange={setPickedChapterId}
            disabled={disabled || chapters.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  chapters.length === 0
                    ? 'No chapters in this course yet'
                    : 'Select a chapter to filter questions'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {chapters.map((chapter) => (
                <SelectItem key={chapter._id} value={chapter._id}>
                  {chapter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Question bank</p>
            <span className="text-xs text-muted-foreground">
              {loading ? 'Loading…' : `${questions.length} shown`}
            </span>
          </div>
          <div className="relative mb-3">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={disabled || needsChapterPick}
            />
          </div>
          <div className="scrollbar-slim max-h-[min(420px,45vh)] space-y-2 overflow-y-auto pr-1">
            {!courseId && !subjectId && !subjectLabel ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Select a live course first to load its subject&apos;s Question Bank.
                </p>
              </div>
            ) : needsChapterPick ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Select a chapter / topic to show matching questions.
                </p>
              </div>
            ) : questions.length === 0 && !loading ? (
              <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No {mode === 'mcq' ? 'MCQ ' : ''}questions found
                  {subjectLabel
                    ? ` for ${subjectLabel}`
                    : filterChapterLabel
                      ? ` for “${filterChapterLabel}”`
                      : ''}
                  .
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={disabled}
                  onClick={() => {
                    if (role === 'instructor') {
                      setBorrowOpen(true);
                    } else {
                      router.push('/admin/platform-question-bank');
                    }
                  }}
                >
                  <LuLibrary className="h-4 w-4" />
                  Borrow Question Bank from Platform
                </Button>
              </div>
            ) : (
              questions.map((q) => {
                const importable = importableIds.has(q._id);
                const already = selectedSet.has(q._id);
                return (
                  <div key={q._id} className="rounded-xl border border-border p-3">
                    <p className="line-clamp-2 text-sm font-medium">
                      <MathText text={q.question} />
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {q.marks ?? 1} mark{(q.marks ?? 1) === 1 ? '' : 's'}
                        {mode === 'mcq' && !importable ? ' · needs 2+ options' : ''}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={already ? 'secondary' : 'outline'}
                        disabled={disabled || !importable || already}
                        onClick={() => toggle(q, true)}
                      >
                        {already ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Selected questions</p>
            <span className="text-xs font-semibold text-muted-foreground">
              {selectedIds.length} Q
            </span>
          </div>
          <div className="scrollbar-slim max-h-[min(420px,45vh)] space-y-2 overflow-y-auto pr-1">
            {selectedQuestions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Add questions from the bank
              </p>
            ) : (
              selectedQuestions.map((q, index) => (
                <div key={q._id} className="rounded-xl border border-border p-3">
                  <p className="line-clamp-2 text-sm font-medium">
                    {index + 1}. <MathText text={q.question} />
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {q.marks ?? 1} mark{(q.marks ?? 1) === 1 ? '' : 's'}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={disabled}
                      onClick={() => toggle(q, false)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          {questions.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              disabled={disabled || selectedIds.length === 0}
              onClick={handleImport}
            >
              {mode === 'text' ? 'Add' : 'Import'} {selectedIds.length || ''} selected question
              {selectedIds.length === 1 ? '' : 's'}
            </Button>
          ) : null}
        </div>
      </div>

      {role === 'instructor' ? (
        <BorrowFromPlatformModal
          open={borrowOpen}
          onClose={() => setBorrowOpen(false)}
          onSubmitted={() => void fetchQuestions()}
        />
      ) : null}
    </div>
  );
}
