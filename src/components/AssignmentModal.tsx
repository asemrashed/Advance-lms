'use client';

import { useState, useEffect } from 'react';
import { Assignment, AssignmentMcqQuestion } from '@/types/assignment';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormModal from '@/components/ui/form-modal';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { McqQuestionEditor } from '@/components/assignments/McqQuestionEditor';
import {
  AssignmentQuestionBankPicker,
  cleanText,
  isTextQuestionInInstructions,
  type AssignmentBankTextQuestion,
} from '@/components/assignments/AssignmentQuestionBankPicker';

function removeQuestionFromInstructions(questionText: string, html: string): string {
  if (!questionText || !html) return html;

  const cleanQ = questionText.trim();
  if (!cleanQ) return html;

  const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const liPattern = new RegExp(`<li>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/li>`, 'gi');
  let result = html.replace(liPattern, '');

  if (result === html) {
    const pPattern = new RegExp(`<p>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/p>`, 'gi');
    result = html.replace(pPattern, '');
  }

  if (result === html) {
    result = html.replace(new RegExp(escaped, 'gi'), '');
  }

  return result
    .replace(/<ol>\s*<\/ol>/gi, '')
    .replace(/<ul>\s*<\/ul>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '');
}
import PDFUpload from '@/components/PDFUpload';
import { fetchStaffCourses, type StaffCourseOption } from '@/lib/staffCourses';
import { CourseSelectionMeta } from '@/components/courses/CourseSelectionMeta';
import { TipTapEditor } from '@/components/ui/TipTapEditor';
import { questionToHtmlFragment } from '@/lib/math/renderMathHtml';

interface AssignmentModalProps {
  open: boolean;
  assignment?: Assignment | null;
  role?: 'admin' | 'instructor';
  onClose: () => void;
  onSuccess: (assignment: Assignment) => void;
  /** Curriculum materials — hide course picker and lock chapter/lesson. */
  courseScoped?: boolean;
  lockedCourse?: {
    courseId: string;
    chapterId?: string;
    chapterTitle?: string;
    lessonId?: string;
    subjectName?: string;
  };
}

type AssignmentAttachment = {
  name: string;
  url: string;
  type: string;
  size?: number;
};

const toLocalDateTimeInputValue = (dateValue?: string | Date) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toISOStringFromLocalInput = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

type FormState = {
  title: string;
  instructions: string;
  type: 'pdf' | 'mcq';
  course: string;
  totalMarks: number;
  passingMarks: number;
  dueDate: string;
  isPublished: boolean;
};

const emptyForm = (): FormState => ({
  title: '',
  instructions: '',
  type: 'pdf',
  course: '',
  totalMarks: 100,
  passingMarks: 50,
  dueDate: '',
  isPublished: false,
});

function questionsToAssignmentHtml(questions: AssignmentBankTextQuestion[]): string {
  const items = questions
    .map((question, questionIndex) => {
      const options =
        question.options.length > 0
          ? `<ol>${question.options
              .map(
                (option, optionIndex) =>
                  `<li><p>${String.fromCharCode(65 + optionIndex)}. ${questionToHtmlFragment(option)}</p></li>`,
              )
              .join('')}</ol>`
          : '';
      return `<li><p><strong>${questionIndex + 1}.</strong> ${questionToHtmlFragment(question.question)} <strong>(${question.marks} mark${
        question.marks === 1 ? '' : 's'
      })</strong></p>${options}</li>`;
    })
    .join('');
  return `<h2>Questions</h2><ol>${items}</ol>`;
}

export default function AssignmentModal({
  open,
  assignment,
  role = 'instructor',
  onClose,
  onSuccess,
  courseScoped = false,
  lockedCourse,
}: AssignmentModalProps) {
  const [courses, setCourses] = useState<StaffCourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [mcqQuestions, setMcqQuestions] = useState<AssignmentMcqQuestion[]>([]);
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([]);
  const [importedQuestionMarks, setImportedQuestionMarks] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (!open) return;
    setCoursesLoading(true);
    fetchStaffCourses('live')
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (assignment) {
      const type =
        assignment.type === 'mcq' ? 'mcq' : 'pdf';
      setFormData({
        title: assignment.title,
        instructions: assignment.instructions || assignment.description || '',
        type,
        course:
          typeof assignment.course === 'string'
            ? assignment.course
            : assignment.course._id,
        totalMarks: assignment.totalMarks,
        passingMarks: assignment.passingMarks,
        dueDate: toLocalDateTimeInputValue(assignment.dueDate),
        isPublished: Boolean(assignment.isPublished),
      });
      setMcqQuestions(assignment.mcqQuestions || []);
      setAttachments(
        Array.isArray((assignment as { attachments?: AssignmentAttachment[] }).attachments)
          ? (assignment as { attachments?: AssignmentAttachment[] }).attachments!
          : [],
      );
      setImportedQuestionMarks({});
    } else {
      const base = emptyForm();
      setFormData({
        ...base,
        course: lockedCourse?.courseId || base.course,
      });
      setMcqQuestions([]);
      setAttachments([]);
      setImportedQuestionMarks({});
    }
  }, [assignment, open, lockedCourse?.courseId]);

  const mcqTotal = mcqQuestions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
  const effectiveTotal =
    formData.type === 'mcq' && mcqTotal > 0 ? mcqTotal : formData.totalMarks;
  const selectedCourse = courses.find((course) => course._id === formData.course);

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'totalMarks' && next.passingMarks > Number(value)) {
        next.passingMarks = Number(value);
      }
      if (field === 'passingMarks' && Number(value) > next.totalMarks) {
        next.passingMarks = next.totalMarks;
      }
      return next;
    });
  };

  const handleInsertBankQuestions = (questions: AssignmentBankTextQuestion[]) => {
    const freshQuestions = questions.filter(
      (question) => importedQuestionMarks[question.id] === undefined,
    );
    if (freshQuestions.length === 0) return;

    const nextMarks = { ...importedQuestionMarks };
    for (const question of freshQuestions) {
      nextMarks[question.id] = question.marks;
    }
    const calculatedMarks = Object.values(nextMarks).reduce(
      (sum, marks) => sum + marks,
      0,
    );
    const addition = questionsToAssignmentHtml(freshQuestions);

    setImportedQuestionMarks(nextMarks);
    setFormData((previous) => ({
      ...previous,
      instructions: `${previous.instructions.trim()}${previous.instructions.trim() ? '<p></p>' : ''}${addition}`,
      totalMarks: calculatedMarks,
      passingMarks: Math.min(previous.passingMarks, calculatedMarks),
    }));
  };

  const handleToggleTextQuestion = (
    question: AssignmentBankTextQuestion,
    checked: boolean,
  ) => {
    if (checked) {
      if (isTextQuestionInInstructions(question.question, formData.instructions)) return;
      handleInsertBankQuestions([question]);
    } else {
      const updatedInstructions = removeQuestionFromInstructions(
        question.question,
        formData.instructions,
      );
      const nextMarks = { ...importedQuestionMarks };
      delete nextMarks[question.id];

      const calculatedMarks = Object.values(nextMarks).reduce(
        (sum, marks) => sum + marks,
        0,
      );

      setImportedQuestionMarks(nextMarks);
      setFormData((previous) => ({
        ...previous,
        instructions: updatedInstructions,
        totalMarks: calculatedMarks > 0 ? calculatedMarks : previous.totalMarks,
        passingMarks:
          calculatedMarks > 0
            ? Math.min(previous.passingMarks, calculatedMarks)
            : previous.passingMarks,
      }));
    }
  };

  const handleToggleMcqQuestion = (
    question: AssignmentMcqQuestion,
    checked: boolean,
  ) => {
    if (checked) {
      setMcqQuestions((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === question.id ||
            m.id.includes(question.id) ||
            (m.question && cleanText(m.question) === cleanText(question.question)),
        );
        if (exists) return prev;
        return [...prev, question];
      });
    } else {
      setMcqQuestions((prev) =>
        prev.filter(
          (m) =>
            m.id !== question.id &&
            !m.id.includes(question.id) &&
            cleanText(m.question) !== cleanText(question.question),
        ),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    const courseId = courseScoped
      ? lockedCourse?.courseId || formData.course
      : formData.course;
    if (!courseId) {
      setError('Select a live course');
      return;
    }
    if (formData.type === 'mcq' && mcqQuestions.length === 0) {
      setError('Add at least one MCQ question');
      return;
    }
    if (effectiveTotal <= 0) {
      setError('Total marks must be greater than 0');
      return;
    }
    if (formData.passingMarks > effectiveTotal) {
      setError('Passing marks cannot exceed total marks');
      return;
    }

    setLoading(true);
    try {
      const url = assignment ? `/api/assignments/${assignment._id}` : '/api/assignments';
      const method = assignment ? 'PUT' : 'POST';

      // Preserve legacy flags on edit; use safe defaults on create.
      const payload = {
        title: formData.title.trim(),
        instructions: formData.instructions.trim() || undefined,
        description: formData.instructions.trim() || undefined,
        type: formData.type,
        course: courseId,
        chapter: lockedCourse?.chapterId || undefined,
        lesson: lockedCourse?.lessonId || undefined,
        totalMarks: effectiveTotal,
        passingMarks: formData.passingMarks,
        dueDate: toISOStringFromLocalInput(formData.dueDate),
        isActive: true,
        isPublished: formData.isPublished,
        maxAttempts: assignment?.maxAttempts ?? 1,
        allowLateSubmission: assignment?.allowLateSubmission ?? false,
        isGroupAssignment: false,
        autoGrade: formData.type === 'mcq',
        showCorrectAnswers: formData.type === 'mcq',
        allowReview: true,
        allowedFileTypes: formData.type === 'pdf' ? ['.pdf'] : undefined,
        maxFileSize: formData.type === 'pdf' ? 50 : undefined,
        mcqQuestions: formData.type === 'mcq' ? mcqQuestions : [],
        attachments: formData.type === 'pdf' ? attachments : [],
        rubric: [],
      };

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save assignment');
        return;
      }

      const saved =
        (data.data?.assignment as Assignment | undefined) ||
        (data.data as Assignment | undefined);
      if (saved) onSuccess(saved);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={assignment ? 'Edit assignment' : 'Create assignment'}
      description={
        courseScoped
          ? 'Scoped to this lesson — course, chapter, and lesson are set automatically'
          : 'Only the essentials — course, type, marks, and publish'
      }
      submitText={
        formData.isPublished
          ? assignment
            ? 'Save & publish'
            : 'Create & publish'
          : assignment
            ? 'Save draft'
            : 'Create draft'
      }
      loading={loading}
      size="2xl"
      submitVariant="primary"
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <AttractiveInput
          id="title"
          label="Title *"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="e.g. Week 3 homework"
          required
        />

        {courseScoped ? (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Scoped to this lesson — course, chapter, and lesson are set automatically.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Live course *</label>
              <Select
                value={formData.course || undefined}
                onValueChange={(value) => handleChange('course', value)}
                disabled={coursesLoading}
              >
                <SelectTrigger className="h-12">
                  <SelectValue
                    placeholder={
                      coursesLoading
                        ? 'Loading…'
                        : courses.length
                          ? 'Select a live course'
                          : 'No live courses found'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      {course.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CourseSelectionMeta courseId={formData.course || undefined} courses={courses} />
          </>
        )}
        {formData.type === 'pdf' ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Assignment file (PDF, optional)
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Upload a question paper, or leave this empty and write the assignment
              below.
            </p>
            <PDFUpload
              currentPDF={attachments[0]?.url || null}
              folder="assignments/papers"
              description={formData.title}
              maxSize={50}
              onPDFChange={(url) =>
                setAttachments([
                  {
                    name: formData.title
                      ? `${formData.title}.pdf`
                      : 'assignment.pdf',
                    url,
                    type: 'application/pdf',
                  },
                ])
              }
              onPDFRemove={() => setAttachments([])}
              onError={(message) => setError(message)}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm font-semibold">Type *</label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleChange('type', value as 'pdf' | 'mcq')}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">Written / PDF submission</SelectItem>
              <SelectItem value="mcq">MCQ quiz</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor="instructions">
            Assignment text (optional)
          </label>
          <TipTapEditor
            value={formData.instructions}
            onChange={(value) => handleChange('instructions', value)}
            placeholder="Write the assignment here, or select questions from the Question Bank…"
            minHeight="180px"
          />
          <p className="text-xs text-muted-foreground">
            A PDF is not required when the assignment is provided here.
          </p>
        </div>

        {formData.type === 'pdf' ? (
          <AssignmentQuestionBankPicker
            role={role}
            courseId={formData.course || undefined}
            subjectId={selectedCourse?.subjectId}
            subjectLabel={
              selectedCourse?.subjectName || lockedCourse?.subjectName
            }
            chapterId={
              courseScoped
                ? lockedCourse?.chapterId
                : undefined
            }
            chapterLabel={
              courseScoped
                ? lockedCourse?.chapterTitle
                : undefined
            }
            lockChapterFilter={Boolean(courseScoped && lockedCourse?.chapterId)}
            mode="text"
            existingInstructions={formData.instructions}
            onToggleTextQuestion={handleToggleTextQuestion}
            onInsertText={handleInsertBankQuestions}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {formData.type === 'pdf' ? (
            <AttractiveInput
              id="totalMarks"
              label="Total marks *"
              type="number"
              min={1}
              value={formData.totalMarks}
              onChange={(e) => handleChange('totalMarks', parseInt(e.target.value, 10) || 0)}
              required
            />
          ) : (
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Total marks</p>
              <p className="text-2xl font-bold">{mcqTotal}</p>
              <p className="text-[11px] text-muted-foreground">Sum of MCQ marks</p>
            </div>
          )}
          <AttractiveInput
            id="passingMarks"
            label="Passing marks *"
            type="number"
            min={0}
            max={effectiveTotal}
            value={formData.passingMarks}
            onChange={(e) => handleChange('passingMarks', parseInt(e.target.value, 10) || 0)}
            required
          />
        </div>

        <AttractiveInput
          id="dueDate"
          label="Due date (optional)"
          type="datetime-local"
          value={formData.dueDate}
          onChange={(e) => handleChange('dueDate', e.target.value)}
        />

        {formData.type === 'mcq' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">MCQ questions</h3>
              <Badge variant="outline">{mcqQuestions.length} questions</Badge>
            </div>
            <AssignmentQuestionBankPicker
              role={role}
              courseId={formData.course || undefined}
              subjectId={selectedCourse?.subjectId}
              subjectLabel={
              selectedCourse?.subjectName || lockedCourse?.subjectName
            }
              chapterId={
                courseScoped
                  ? lockedCourse?.chapterId
                  : undefined
              }
              chapterLabel={
                courseScoped
                  ? lockedCourse?.chapterTitle
                  : undefined
              }
              lockChapterFilter={Boolean(courseScoped && lockedCourse?.chapterId)}
              existingMcqQuestions={mcqQuestions}
              onToggleMcqQuestion={handleToggleMcqQuestion}
              onImport={(imported) =>
                setMcqQuestions((prev) => [...prev, ...imported])
              }
            />
            <McqQuestionEditor questions={mcqQuestions} onChange={setMcqQuestions} />
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Publish to students</p>
            <p className="text-xs text-muted-foreground">
              Off = save as draft. On = visible to enrolled students.
            </p>
          </div>
          <Switch
            checked={formData.isPublished}
            onCheckedChange={(checked) => handleChange('isPublished', checked)}
          />
        </div>
      </div>
    </FormModal>
  );
}
