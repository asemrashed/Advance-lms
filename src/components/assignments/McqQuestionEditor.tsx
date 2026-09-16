'use client';

import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import type { AssignmentMcqQuestion } from '@/types/assignment';
import { LuPlus as Plus, LuTrash2 as Trash } from 'react-icons/lu';
import { MathText } from '@/components/ui/MathText';

type Props = {
  questions: AssignmentMcqQuestion[];
  onChange: (questions: AssignmentMcqQuestion[]) => void;
};

function emptyQuestion(index: number): AssignmentMcqQuestion {
  return {
    id: `q-${Date.now()}-${index}`,
    question: '',
    options: ['', ''],
    correctOptionIndex: 0,
    marks: 1,
  };
}

export function McqQuestionEditor({ questions, onChange }: Props) {
  const updateQuestion = (index: number, patch: Partial<AssignmentMcqQuestion>) => {
    const next = questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange(next);
  };

  const addQuestion = () => onChange([...questions, emptyQuestion(questions.length)]);

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const q = questions[qIndex];
    if (!q) return;
    const options = [...q.options];
    options[optIndex] = value;
    updateQuestion(qIndex, { options });
  };

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (!q) return;
    updateQuestion(qIndex, { options: [...q.options, ''] });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (!q || q.options.length <= 2) return;
    const options = q.options.filter((_, i) => i !== optIndex);
    let correctOptionIndex = q.correctOptionIndex ?? 0;
    if (correctOptionIndex >= options.length) correctOptionIndex = options.length - 1;
    updateQuestion(qIndex, { options, correctOptionIndex });
  };

  return (
    <div className="space-y-4">
      {questions.map((q, qIndex) => (
        <div key={q.id} className="rounded-lg border bg-white/80 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">Question {qIndex + 1}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
          <AttractiveTextarea
            label="Question"
            value={q.question}
            onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
            rows={2}
          />
          {q.question.trim() ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-sm">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Student preview
              </p>
              <MathText text={q.question} />
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium">Options</p>
            {q.options.map((opt, optIndex) => (
              <div key={`${q.id}-opt-${optIndex}`} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={(q.correctOptionIndex ?? 0) === optIndex}
                  onChange={() => updateQuestion(qIndex, { correctOptionIndex: optIndex })}
                  aria-label={`Mark option ${optIndex + 1} as correct`}
                />
                <AttractiveInput
                  value={opt}
                  onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                  placeholder={`Option ${optIndex + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={q.options.length <= 2}
                  onClick={() => removeOption(qIndex, optIndex)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addOption(qIndex)}>
              <Plus className="mr-1 h-4 w-4" /> Add option
            </Button>
          </div>
          <AttractiveInput
            type="number"
            label="Marks"
            min={1}
            value={q.marks}
            onChange={(e) => updateQuestion(qIndex, { marks: Number(e.target.value) || 1 })}
          />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add MCQ question
      </Button>
    </div>
  );
}
