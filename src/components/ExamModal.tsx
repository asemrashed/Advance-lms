'use client';

import { useState, useEffect, useMemo } from 'react';
import { Exam, CreateExamData } from '@/types/exam';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormModal from '@/components/ui/form-modal';
import { fetchStaffCourses, type StaffCourseOption } from '@/lib/staffCourses';
import { CourseSelectionMeta } from '@/components/courses/CourseSelectionMeta';
import { useSubjects } from '@/hooks/useSubjects';
import { componentLabel } from '@/lib/subjectComponents';
import type { SubjectComponent } from '@/types/subject';

interface ExamModalProps {
  open: boolean;
  exam?: Exam | null;
  onClose: () => void;
  /** Called after save. For new exams, parent should route to question setup. */
  onSuccess: (exam: Exam) => void;
}

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
  duration: number;
  instructions: string;
  startDate: string;
  endDate: string;
  course: string;
  componentId: string;
};

const emptyForm = (): FormState => ({
  title: '',
  duration: 60,
  instructions: '',
  startDate: '',
  endDate: '',
  course: '',
  componentId: '',
});

export default function ExamModal({ open, exam, onClose, onSuccess }: ExamModalProps) {
  const [courses, setCourses] = useState<StaffCourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const { subjects } = useSubjects({ limit: 200, isActive: true, sortBy: 'name' });

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
    if (exam) {
      const c = exam.course as { _id?: { toString(): string }; toString(): string } | undefined;
      setFormData({
        title: exam.title,
        duration: exam.duration,
        instructions: exam.instructions || '',
        startDate: toLocalDateTimeInputValue(exam.startDate),
        endDate: toLocalDateTimeInputValue(exam.endDate),
        course: c ? (c._id ? c._id.toString() : c.toString()) : '',
        componentId: exam.componentId ? String(exam.componentId) : '',
      });
    } else {
      setFormData(emptyForm());
    }
  }, [exam, open]);

  const selectedCourse = courses.find((c) => c._id === formData.course);
  const subjectForCourse = useMemo(() => {
    if (!selectedCourse) return undefined;
    if (selectedCourse.subjectId) {
      return subjects.find((s) => s._id === selectedCourse.subjectId);
    }
    if (selectedCourse.subjectCode) {
      return subjects.find(
        (s) => s.code.toUpperCase() === selectedCourse.subjectCode?.toUpperCase(),
      );
    }
    if (selectedCourse.subjectName) {
      return subjects.find(
        (s) =>
          s.name.toLowerCase() === selectedCourse.subjectName?.trim().toLowerCase(),
      );
    }
    return undefined;
  }, [selectedCourse, subjects]);

  const components: SubjectComponent[] = useMemo(() => {
    return (subjectForCourse?.components || [])
      .slice()
      .sort((a, b) => a.order - b.order);
  }, [subjectForCourse]);

  const selectedComponent = components.find((c) => c._id === formData.componentId);
  const derivedType: CreateExamData['type'] =
    selectedComponent?.type === 'written' ? 'written' : 'mcq';

  useEffect(() => {
    if (!formData.componentId) return;
    if (components.length && !components.some((c) => c._id === formData.componentId)) {
      setFormData((prev) => ({ ...prev, componentId: '' }));
    }
  }, [components, formData.componentId]);

  const handleInputChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Exam title is required');
      return;
    }
    if (!formData.course) {
      setError('Select a live course');
      return;
    }
    if (!formData.componentId) {
      setError('Select an exam component');
      return;
    }
    if (!formData.duration || formData.duration < 1) {
      setError('Duration must be at least 1 minute');
      return;
    }
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate).getTime() < new Date(formData.startDate).getTime()) {
        setError('End date must be after start date');
        return;
      }
    }

    setLoading(true);
    try {
      const url = exam ? `/api/exams/${exam._id}` : '/api/exams';
      const method = exam ? 'PUT' : 'POST';

      const payload = {
        title: formData.title.trim(),
        type: derivedType,
        componentId: formData.componentId,
        duration: formData.duration,
        instructions: formData.instructions.trim() || undefined,
        startDate: toISOStringFromLocalInput(formData.startDate),
        endDate: toISOStringFromLocalInput(formData.endDate),
        course: formData.course,
        totalMarks: exam?.totalMarks || 1,
        passingMarks: exam?.passingMarks ?? 0,
        attempts: exam?.attempts ?? 1,
        isActive: true,
        isPublished: exam ? Boolean(exam.isPublished) : false,
      };

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save exam');
        return;
      }

      onSuccess(data.data as Exam);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCreate = !exam;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isCreate ? 'Create exam' : 'Edit exam details'}
      description={
        isCreate
          ? 'Step 1 of 2 — pick a live course and component, then add questions next'
          : 'Update exam details (questions are managed separately)'
      }
      submitText={isCreate ? 'Save draft & add questions' : 'Save changes'}
      loading={loading}
      size="xl"
      submitVariant="primary"
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Live course *</label>
          <Select
            value={formData.course || undefined}
            onValueChange={(value) => {
              handleInputChange('course', value);
              handleInputChange('componentId', '');
            }}
            disabled={coursesLoading}
          >
            <SelectTrigger className="h-12">
              <SelectValue
                placeholder={
                  coursesLoading
                    ? 'Loading live courses…'
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

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Exam component *</label>
          <Select
            value={formData.componentId || undefined}
            onValueChange={(value) => handleInputChange('componentId', value)}
            disabled={!formData.course || !components.length}
          >
            <SelectTrigger className="h-12">
              <SelectValue
                placeholder={
                  !formData.course
                    ? 'Select a course first'
                    : !subjectForCourse
                      ? 'Course subject not linked'
                      : components.length
                        ? 'Select component (Paper 1, …)'
                        : 'No components — add them on the subject'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {components.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {componentLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedComponent ? (
            <p className="text-xs text-muted-foreground">
              Exam type: <strong>{selectedComponent.type === 'mcq' ? 'MCQ' : 'Written'}</strong>{' '}
              (from component)
            </p>
          ) : null}
        </div>

        <AttractiveInput
          id="title"
          label="Exam title *"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="e.g. Midterm — Algebra"
          required
        />

        <AttractiveInput
          id="duration"
          label="Duration (minutes) *"
          type="number"
          min="1"
          max="1440"
          value={formData.duration}
          onChange={(e) => handleInputChange('duration', parseInt(e.target.value, 10) || 0)}
          required
        />

        <AttractiveTextarea
          id="instructions"
          label="Instructions (optional)"
          value={formData.instructions}
          onChange={(e) => handleInputChange('instructions', e.target.value)}
          placeholder="Brief instructions for students"
          rows={2}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AttractiveInput
            id="startDate"
            label="Start (optional)"
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
          />
          <AttractiveInput
            id="endDate"
            label="End (optional)"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
          />
        </div>

        {isCreate ? (
          <p className="text-xs text-muted-foreground">
            The exam is saved as a <strong>draft</strong>. You’ll add questions next, then
            choose Draft or Publish.
          </p>
        ) : null}
      </div>
    </FormModal>
  );
}
