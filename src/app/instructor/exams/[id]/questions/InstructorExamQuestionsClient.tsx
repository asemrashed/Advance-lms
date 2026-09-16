'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LuPlus as Plus,
  LuUpload as Upload,
  LuPencil as Edit,
  LuTrash2 as Trash2,
  LuArrowLeft as ArrowLeft,
  LuCheck as Check,
  LuBookOpen as BookOpen,
} from 'react-icons/lu';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import InstructorPageWrapper from '@/components/InstructorPageWrapper';
import {
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { Question } from '@/types/exam';
import { MathText } from '@/components/ui/MathText';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttractiveInput } from '@/components/ui/attractive-input';
import ConfirmModal from '@/components/ui/confirm-modal';
import QuestionModal from '@/components/QuestionModal';
import CSVUploadModal from '@/components/CSVUploadModal';
import ExamQuestionBankModal from '@/components/exams/ExamQuestionBankModal';
import { examsStaffService } from '@/services/examsStaffService';
import { questionsStaffService } from '@/services/questionsStaffService';

interface QuestionsPageProps {
  params: Promise<{ id: string }>;
}

type ExamSummary = {
  _id: string;
  title: string;
  type: 'mcq' | 'written' | 'mixed';
  duration: number;
  totalMarks: number;
  passingMarks: number;
  isPublished?: boolean;
  subject?: string;
  subjectCode?: string;
  grade?: string;
  componentId?: string;
  componentName?: string;
  course?: { title?: string; subjectName?: string; subjectCode?: string; grade?: string } | string;
};

function InstructorQuestionsPageContent({ params }: QuestionsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get('setup') === '1';

  const [examId, setExamId] = useState('');
  const [exam, setExam] = useState<ExamSummary | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [passingMarks, setPassingMarks] = useState(0);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void params.then((p) => setExamId(p.id));
  }, [params]);

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + Number(q.marks || 0), 0),
    [questions],
  );

  const fetchExam = useCallback(async () => {
    if (!examId) return;
    const response = await examsStaffService.getInstructorExam(examId);
    const data = await response.json();
    if (response.ok) {
      const next = (data.data?.exam || data.exam) as ExamSummary;
      setExam(next);
      setPassingMarks(Number(next.passingMarks || 0));
    }
  }, [examId]);

  const fetchQuestions = useCallback(async () => {
    if (!examId) return;
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: '1',
        limit: '500',
        exam: examId,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
      const response = await questionsStaffService.listInstructorQuestions(query.toString());
      const data = await response.json();
      if (response.ok) {
        const list = data.data?.questions || data.questions || [];
        setQuestions(Array.isArray(list) ? list : []);
      } else {
        setQuestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (!examId) return;
    void fetchExam();
    void fetchQuestions();
  }, [examId, fetchExam, fetchQuestions]);

  const refreshAll = async () => {
    await Promise.all([fetchExam(), fetchQuestions()]);
  };

  const finalizeExam = async (publish: boolean) => {
    if (!examId) return;
    setStatusError('');
    if (publish && questions.length === 0) {
      setStatusError('Add at least one question before publishing');
      return;
    }
    if (passingMarks > totalMarks) {
      setStatusError('Passing marks cannot exceed total marks');
      return;
    }

    setSavingStatus(true);
    try {
      const response = await examsStaffService.updateExam(examId, {
          isPublished: publish,
          isActive: true,
          passingMarks,
          totalMarks: totalMarks || 1,
          reconcileMarks: true,
        });
      const data = await response.json();
      if (!response.ok) {
        setStatusError(data.error || 'Failed to update exam');
        return;
      }
      router.push('/instructor/exams');
    } catch {
      setStatusError('Unexpected error. Please try again.');
    } finally {
      setSavingStatus(false);
    }
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;
    setDeleting(true);
    try {
      const response = await questionsStaffService.deleteInstructorQuestion(questionToDelete._id);
      if (response.ok) {
        setQuestions((prev) => prev.filter((q) => q._id !== questionToDelete._id));
        setShowDeleteConfirm(false);
        setQuestionToDelete(null);
        await fetchExam();
      } else {
        const data = await response.json().catch(() => ({}));
        setStatusError(data.error || 'Failed to delete question');
      }
    } catch {
      setStatusError('Failed to delete question');
    } finally {
      setDeleting(false);
    }
  };

  const courseTitle =
    exam?.course && typeof exam.course === 'object'
      ? exam.course.title
      : undefined;

  return (
    <InstructorRoleShell>
      <InstructorPage className="p-2 sm:p-4">
        <InstructorTopbar
          title={
            isSetup
              ? `Step 2 — Add questions${exam ? `: ${exam.title}` : ''}`
              : exam
                ? `Questions · ${exam.title}`
                : 'Exam questions'
          }
          subtitle={
            isSetup
              ? 'Add questions manually, from the question bank, or via CSV, then save or publish'
              : 'Manage questions for this exam'
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push('/instructor/exams')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to exams
            </Button>
          }
        />

        {exam ? (
          <div className="mb-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span>
                Type: <strong className="text-foreground">{exam.type.toUpperCase()}</strong>
              </span>
              <span>
                Duration: <strong className="text-foreground">{exam.duration}m</strong>
              </span>
              {courseTitle ? (
                <span>
                  Course: <strong className="text-foreground">{courseTitle}</strong>
                </span>
              ) : null}
              {exam.subject ? (
                <span>
                  Subject: <strong className="text-foreground">{exam.subject}</strong>
                  {exam.subjectCode ? ` (${exam.subjectCode})` : ''}
                </span>
              ) : null}
              {exam.grade ? (
                <span>
                  Grade: <strong className="text-foreground">{exam.grade}</strong>
                </span>
              ) : null}
              <span>
                Status:{' '}
                <strong className="text-foreground">
                  {exam.isPublished ? 'Published' : 'Draft'}
                </strong>
              </span>
            </div>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2">
          <Button className="gap-1.5" onClick={() => { setEditingQuestion(null); setShowQuestionModal(true); }}>
            <Plus className="h-4 w-4" />
            Add question
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setShowQuestionBank(true)}>
            <BookOpen className="h-4 w-4" />
            Add from Question Bank
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setShowCSVUpload(true)}>
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
        </div>

        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading questions…</p>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium">No questions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add one manually, choose from the question bank, or upload a CSV.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {questions.map((q, index) => (
                <li key={q._id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 w-6 shrink-0 text-sm font-bold text-muted-foreground">
                    {index + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <MathText as="p" className="text-sm font-medium leading-snug" text={q.question} />
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {q.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {q.marks} marks
                      </Badge>
                      {q.type === 'mcq' || q.type === 'true_false' ? (
                        <Badge variant="outline" className="text-[10px]">
                          {q.options?.length || 0} options
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingQuestion(q);
                        setShowQuestionModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        setQuestionToDelete(q);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Questions
              </p>
              <p className="text-2xl font-bold">{questions.length}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total marks
              </p>
              <p className="text-2xl font-bold">{totalMarks}</p>
              <p className="text-[11px] text-muted-foreground">Sum of question marks</p>
            </div>
            <AttractiveInput
              id="passingMarks"
              label="Passing marks"
              type="number"
              min={0}
              max={Math.max(totalMarks, 0)}
              value={passingMarks}
              onChange={(e) => setPassingMarks(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          {statusError ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {statusError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={savingStatus}
              onClick={() => void finalizeExam(false)}
            >
              Save draft
            </Button>
            <Button
              disabled={savingStatus || questions.length === 0}
              className="gap-1.5"
              onClick={() => void finalizeExam(true)}
            >
              <Check className="h-4 w-4" />
              {savingStatus ? 'Saving…' : 'Publish exam'}
            </Button>
          </div>
        </div>

        <QuestionModal
          open={showQuestionModal}
          question={editingQuestion}
          examId={examId}
          examType={exam?.type}
          role="instructor"
          lockScopeFromExam
          defaultSubject={
            exam?.subject ||
            (typeof exam?.course === 'object' ? exam.course?.subjectName : undefined)
          }
          defaultSubjectCode={
            exam?.subjectCode ||
            (typeof exam?.course === 'object' ? exam.course?.subjectCode : undefined)
          }
          defaultGrade={
            exam?.grade ||
            (typeof exam?.course === 'object' ? exam.course?.grade : undefined)
          }
          defaultComponentId={exam?.componentId}
          defaultComponentName={exam?.componentName}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
            void refreshAll();
          }}
        />

        <CSVUploadModal
          open={showCSVUpload}
          onClose={() => setShowCSVUpload(false)}
          onSuccess={() => {
            setShowCSVUpload(false);
            void refreshAll();
          }}
          examId={examId}
          examType={exam?.type}
        />

        <ExamQuestionBankModal
          open={showQuestionBank}
          examId={examId}
          subject={exam?.subject}
          onClose={() => setShowQuestionBank(false)}
          onSuccess={() => {
            setShowQuestionBank(false);
            void refreshAll();
          }}
        />

        <ConfirmModal
          open={showDeleteConfirm}
          onClose={() => {
            if (!deleting) {
              setShowDeleteConfirm(false);
              setQuestionToDelete(null);
            }
          }}
          onConfirm={confirmDelete}
          title="Delete question"
          description="Remove this question from the exam? This cannot be undone."
          confirmText={deleting ? 'Deleting…' : 'Delete'}
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </InstructorPage>
    </InstructorRoleShell>
  );
}

export default function InstructorQuestionsPage({ params }: QuestionsPageProps) {
  return (
    <InstructorPageWrapper>
      <InstructorQuestionsPageContent params={params} />
    </InstructorPageWrapper>
  );
}
