'use client';

import { useMemo, useRef, useState } from 'react';
import { Question } from '@/types/exam';
import FormModal from '@/components/ui/form-modal';
import {
  StaffQuestionComposer,
  clearComposerDraft,
  itemFromExisting,
  validateComposerPayload,
  type StaffQuestionComposerHandle,
} from '@/components/questions/StaffQuestionComposer';
import { formatGradeLabel } from '@/lib/courseLabel';
import { normalizeBatchGrade } from '@/lib/batchGrades';

interface QuestionModalProps {
  open: boolean;
  question?: Question | null;
  examId?: string;
  examType?: 'mcq' | 'written' | 'mixed';
  role?: 'admin' | 'instructor';
  defaultSubject?: string | null;
  defaultSubjectCode?: string | null;
  defaultTopic?: string | null;
  defaultGrade?: string | null;
  defaultComponentId?: string | null;
  defaultComponentName?: string | null;
  /** When creating questions on an exam, inherit and lock class/subject/component. */
  lockScopeFromExam?: boolean;
  onClose: () => void;
  onSuccess: (question: Question) => void;
}

export default function QuestionModal({
  open,
  question,
  examId,
  examType,
  role = 'instructor',
  defaultSubject,
  defaultSubjectCode,
  defaultTopic,
  defaultGrade,
  defaultComponentId,
  defaultComponentName,
  lockScopeFromExam = false,
  onClose,
  onSuccess,
}: QuestionModalProps) {
  const composerRef = useRef<StaffQuestionComposerHandle>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const q = question as Question & {
    subjectId?: string;
    subject?: string;
    subjectCode?: string;
    grade?: string;
    componentId?: string;
    topic?: string;
    subtopic?: string;
  };

  const lockScope = Boolean(lockScopeFromExam && examId && !question);

  const defaultScope = useMemo(() => {
    const rawGrade = q?.grade || defaultGrade || '';
    return {
      subjectName: q?.subject || defaultSubject || '',
      subjectId: q?.subjectId || '',
      subjectCode: q?.subjectCode || defaultSubjectCode || '',
      grade: rawGrade ? normalizeBatchGrade(rawGrade) : '',
      componentId: q?.componentId || defaultComponentId || '',
      topic: q?.topic || defaultTopic || '',
      subtopic: q?.subtopic || '',
    };
  }, [
    q,
    defaultSubject,
    defaultSubjectCode,
    defaultTopic,
    defaultGrade,
    defaultComponentId,
  ]);

  const lockedScopeLabels = useMemo(
    () => ({
      grade: defaultScope.grade ? formatGradeLabel(defaultScope.grade) : undefined,
      subject: defaultScope.subjectName || defaultScope.subjectCode || undefined,
      component: defaultComponentName || undefined,
    }),
    [defaultScope.grade, defaultScope.subjectName, defaultScope.subjectCode, defaultComponentName],
  );

  const initialItems = useMemo(
    () =>
      question
        ? [
            itemFromExisting({
              questionText: question.question,
              options: question.options,
              answerText: question.correctAnswer,
              marks: question.marks,
              difficulty: question.difficulty,
            }),
          ]
        : undefined,
    [question],
  );

  const handleSubmit = async (e: React.FormEvent) => {
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
      const shared = {
        subject: scope.subjectName.trim(),
        subjectId: scope.subjectId || undefined,
        subjectCode: scope.subjectCode || undefined,
        grade: scope.grade || undefined,
        componentId: scope.componentId,
        topic: scope.topic.trim(),
        subtopic: scope.subtopic.trim() || undefined,
        type: format,
        exam: examId || undefined,
      };

      if (question) {
        const item = items[0];
        const response = await fetch(`/api/questions/${question._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...shared,
            question: item.questionText,
            marks: item.marks,
            difficulty: item.difficulty,
            options:
              format === 'written'
                ? []
                : item.options.filter((option) => option.text.trim()),
            correctAnswer: item.answerText.trim() || undefined,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Failed to save question');
          return;
        }
        onSuccess(data.data);
        onClose();
        return;
      }

      const response = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          exam: examId || undefined,
          questions: items.map((item) => ({
            ...shared,
            question: item.questionText,
            marks: item.marks,
            difficulty: item.difficulty,
            options:
              format === 'written'
                ? []
                : item.options.filter((option) => option.text.trim()),
            correctAnswer: item.answerText.trim() || undefined,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save questions');
        return;
      }
      clearComposerDraft('course', role);
      onSuccess(Array.isArray(data.data) ? data.data[0] : data.data);
      onClose();
    } catch {
      setError('Failed to save questions');
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
      title={question ? 'Edit Question' : 'Create Questions'}
      description={
        lockScope
          ? 'Questions are saved under this exam’s class, subject, and component.'
          : 'Saved under the selected class, subject, component, and topic.'
      }
      submitText={question ? 'Update Question' : 'Save questions'}
      loading={loading}
      size="xl"
      submitVariant="primary"
      formClassName="!space-y-3"
    >
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      <StaffQuestionComposer
        key={
          question?._id ||
          `create-${examId || 'solo'}-${defaultScope.componentId || defaultScope.subjectName || 'new'}`
        }
        ref={composerRef}
        bank="course"
        role={role}
        editing={Boolean(question)}
        defaultScope={defaultScope}
        initialItems={initialItems}
        lockScope={lockScope}
        defaultFormat={
          examType === 'written' ? 'written' : examType === 'mcq' ? 'mcq' : 'mcq'
        }
        lockedScopeLabels={lockedScopeLabels}
      />
    </FormModal>
  );
}
