'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import FormModal from '@/components/ui/form-modal';
import {
  platformQuestionsService,
  type PlatformQuestionPayload,
} from '@/services/platformQuestionsService';
import {
  StaffQuestionComposer,
  clearComposerDraft,
  fromPlatformDifficulty,
  itemFromExisting,
  platformDifficulty,
  validateComposerPayload,
  type StaffQuestionComposerHandle,
} from '@/components/questions/StaffQuestionComposer';
export type PlatformQuestionRow = {
  _id: string;
  subject: string;
  subjectId?: string;
  subjectCode?: string;
  grade?: string;
  componentId?: string;
  componentName?: string;
  componentType?: 'mcq' | 'written';
  topic: string;
  subtopic?: string;
  difficulty: 1 | 2 | 3;
  questionFormat?: 'mcq' | 'written';
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  answerText?: string;
  explanation?: string;
  hasDiagram?: boolean;
  diagramUrl?: string;
  ownerType?: 'admin' | 'instructor';
  ownerId?: string;
  accessPolicy?: 'private' | 'shared_with_instructors' | 'public';
  tags?: string[];
  isActive?: boolean;
  inTestYourself?: boolean;
  readOnly?: boolean;
  sourceType?: 'manual' | 'claude' | 'pdf' | 'pastpaper';
  qid?: string;
  topicNumber?: number;
  year?: number;
  session?: 'FM' | 'MJ' | 'ON';
  paper?: string;
  questionNumber?: string;
  msText?: string;
  marks?: number;
  calculatorType?: string;
  diagramStatus?: 'none' | 'missing' | 'uploaded';
  hasMsDiagram?: boolean;
  msDiagramStatus?: 'none' | 'missing' | 'uploaded';
  msDiagramUrl?: string;
  status?: 'complete' | 'incomplete';
  notes?: string;
};

type CurriculumContext = {
  batchId?: string;
  batchClassId?: string;
  subjectModuleId?: string;
  subjectLessonId?: string;
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
};

interface Props {
  open: boolean;
  question?: PlatformQuestionRow | null;
  role: 'admin' | 'instructor';
  defaultSubject?: string | null;
  defaultTopic?: string | null;
  defaultAccessPolicy?: PlatformQuestionPayload['accessPolicy'];
  curriculumContext?: CurriculumContext;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PlatformQuestionModal({
  open,
  question,
  role,
  defaultSubject,
  defaultTopic,
  defaultAccessPolicy,
  curriculumContext,
  onClose,
  onSuccess,
}: Props) {
  const composerRef = useRef<StaffQuestionComposerHandle>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultScope = useMemo(
    () => ({
      subjectName: question?.subject || defaultSubject || '',
      subjectId: question?.subjectId || '',
      subjectCode: question?.subjectCode || '',
      grade: question?.grade || '',
      componentId: question?.componentId || '',
      topic: question?.topic || defaultTopic || '',
      subtopic: question?.subtopic || '',
    }),
    [question, defaultSubject, defaultTopic],
  );

  const initialItems = useMemo(
    () =>
      question
        ? [
            itemFromExisting({
              questionText: question.questionText,
              options: question.options,
              answerText: question.answerText,
              marks: question.marks,
              difficulty: fromPlatformDifficulty(question.difficulty),
            }),
          ]
        : undefined,
    [question],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = composerRef.current?.getPayload();
    if (!payload) return;
    const invalid = validateComposerPayload(payload);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { scope, format, items } = payload;
      for (const item of items) {
        const body: PlatformQuestionPayload & CurriculumContext = {
          subject: scope.subjectName.trim(),
          subjectId: scope.subjectId || undefined,
          subjectCode: scope.subjectCode || undefined,
          grade: scope.grade || undefined,
          componentId: scope.componentId,
          topic: scope.topic.trim(),
          subtopic: scope.subtopic.trim() || undefined,
          difficulty: platformDifficulty(item.difficulty),
          questionFormat: format,
          questionText: item.questionText,
          options:
            format === 'written'
              ? []
              : item.options
                  .filter((option) => option.text.trim())
                  .map((option) => ({ text: option.text.trim(), isCorrect: Boolean(option.isCorrect) })),
          answerText: item.answerText.trim() || undefined,
          accessPolicy: defaultAccessPolicy || 'private',
          isActive: true,
          marks: item.marks,
          ...(curriculumContext ?? {}),
        };
        const res = question
          ? await platformQuestionsService.update(question._id, body)
          : await platformQuestionsService.create(body);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error || 'Failed to save question');
          return;
        }
      }
      if (!question) clearComposerDraft('platform', role);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={question ? 'Edit platform question' : 'Add platform questions'}
      description="Class first, then subject and component. Component type sets MCQ or written."
      loading={loading}
      size="xl"
      formClassName="!space-y-3"
    >
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      <StaffQuestionComposer
        key={question?._id || 'create'}
        ref={composerRef}
        bank="platform"
        role={role}
        editing={Boolean(question)}
        defaultScope={defaultScope}
        initialItems={initialItems}
      />
    </FormModal>
  );
}
