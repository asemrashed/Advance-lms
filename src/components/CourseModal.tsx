'use client';

import { useState, useEffect } from 'react';
import { Course, CreateCourseRequest, UpdateCourseRequest, type CourseType } from '@/types/course';
import type { Subject } from '@/types/subject';
import { Input } from '@/components/ui/input';
import FormModal from '@/components/ui/form-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { InstructorSelector } from '@/components/ui/instructor-selector';
import CustomEditor from '@/components/custom-editor';
import TipTapEditor from '@/components/ui/TipTapEditor';
import { ImageSourceField } from '@/components/ui/ImageSourceField';
import { TakaIcon } from '@/components/ui/TakaIcon';
import { LuTag as Tag, LuBookOpen as BookOpen, LuLoader as Loader2, LuUser as User, LuSearch as Search, LuX as X, LuAward as Award } from 'react-icons/lu';;
import { useTeachers } from '@/hooks/useTeachers';
import { BATCH_GRADES } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';

interface CourseModalProps {
  open: boolean;
  course?: Course | null;
  onClose: () => void;
  onSuccess: () => void;
  showInstructorField?: boolean;
}

export default function CourseModal({
  open,
  course,
  onClose,
  onSuccess,
  showInstructorField = true
}: CourseModalProps) {
  const [formData, setFormData] = useState<CreateCourseRequest & {
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
  }>({
    title: '',
    courseType: 'recorded',
    shortDescription: '',
    description: '',
    category: '',
    subjectId: '',
    subjectCode: '',
    subjectName: '',
    grade: '',
    thumbnailUrl: '',
    isPaid: false,
    status: 'draft',
    price: undefined,
    salePrice: undefined,
    monthlyPrice: undefined,
    instructor: undefined
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showInstructorDropdown, setShowInstructorDropdown] = useState(false);
  const [instructorSearch, setInstructorSearch] = useState('');
  const { teachers, loading: loadingTeachers } = useTeachers();

  // Filter teachers based on search
  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(instructorSearch.toLowerCase()) ||
    teacher.email.toLowerCase().includes(instructorSearch.toLowerCase())
  );

  const fetchSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const response = await fetch('/api/subjects?limit=200&isActive=true');
      const data = await response.json();
      
      if (response.ok) {
        setSubjects(data.data.subjects || []);
      } else {
        console.error('Failed to fetch subjects:', data.error);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSubjects();
    }
  }, [open]);

  const normalizeSubjectId = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'object' && value !== null && '_id' in (value as object)) {
      return String((value as { _id: unknown })._id);
    }
    return String(value);
  };

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        courseType: (course.courseType || 'recorded') as CourseType,
        shortDescription: (course as Course & { shortDescription?: string }).shortDescription || '',
        description: course.description || '',
        category: course.subjectName || course.category || '',
        subjectId: normalizeSubjectId(course.subjectId),
        subjectCode: course.subjectCode || '',
        subjectName: course.subjectName || course.category || '',
        grade: course.grade ? String(course.grade) : '',
        thumbnailUrl: course.thumbnailUrl || '',
        isPaid: course.isPaid,
        status: course.status,
        price: course.price,
        salePrice: course.salePrice,
        monthlyPrice: course.monthlyPrice,
        instructor: typeof course.instructor === 'string' ? course.instructor : course.instructor?._id
      });
    } else {
      setFormData({
        title: '',
        courseType: 'recorded',
        shortDescription: '',
        description: '',
        category: '',
        subjectId: '',
        subjectCode: '',
        subjectName: '',
        grade: '',
        thumbnailUrl: '',
        isPaid: false,
        status: 'draft',
        price: undefined,
        salePrice: undefined,
        monthlyPrice: undefined,
        instructor: undefined
      });
    }
    setErrors({});
  }, [course, open]);

  useEffect(() => {
    if (!open || !subjects.length || !course) return;
    if (course.subjectId) return;
    const label = (course.subjectName || course.category || '').trim();
    if (!label) return;
    const match = subjects.find(
      (s) => s.name.toLowerCase() === label.toLowerCase(),
    );
    if (!match) return;
    setFormData((prev) => ({
      ...prev,
      subjectId: match._id,
      subjectCode: match.code,
      subjectName: match.name,
      category: match.name,
    }));
  }, [open, subjects, course]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    }

    if (!formData.subjectId?.trim()) {
      newErrors.subjectId = 'Subject is required';
    }

    if (formData.courseType === 'live' && !formData.grade?.trim()) {
      newErrors.grade = 'Class / grade is required for live courses';
    }

    if (formData.isPaid && (!formData.price || formData.price <= 0)) {
      newErrors.price = 'Paid courses must have a valid price';
    }

    if (formData.salePrice && formData.price && formData.salePrice >= formData.price) {
      newErrors.salePrice = 'Sale price must be less than regular price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const url = course ? `/api/courses/${course._id}` : '/api/courses';
      const method = course ? 'PUT' : 'POST';
      const plainShortDescription = (formData.shortDescription || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const payload = {
        ...formData,
        shortDescription: plainShortDescription,
        description: formData.description || '',
        isPaid: formData.isPaid,
        price: formData.isPaid ? formData.price : undefined,
        salePrice: formData.isPaid ? formData.salePrice : undefined,
        monthlyPrice: formData.isPaid ? formData.monthlyPrice : undefined,
        subjectId: (formData as CreateCourseRequest & { subjectId?: string }).subjectId,
        subjectCode: (formData as CreateCourseRequest & { subjectCode?: string }).subjectCode,
        subjectName: (formData as CreateCourseRequest & { subjectName?: string }).subjectName,
        category:
          (formData as CreateCourseRequest & { subjectName?: string }).subjectName ||
          formData.category,
        grade: String((formData as CreateCourseRequest & { grade?: string }).grade || '').trim() || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(course ? 'Course updated successfully' : 'Course created successfully');
        onSuccess();
      } else {
        console.error('Failed to save course:', data.error);
        setErrors({ submit: data.error || 'Failed to save course' });
      }
    } catch (error) {
      console.error('Error saving course:', error);
      setErrors({ submit: 'An error occurred while saving the course' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateCourseRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePaidToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isPaid: checked,
      price: checked ? prev.price || 0 : undefined,
      salePrice: checked ? prev.salePrice : undefined,
      monthlyPrice: checked ? prev.monthlyPrice : undefined
    }));
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={course ? 'Edit Course' : 'Add New Course'}
      description={course ? 'Update course information and settings' : 'Create a new course for your students'}
      submitText={course ? 'Update Course' : 'Create Course'}
      loading={loading}
      size="lg"
      formId="course-form"
    >
      <AttractiveInput
        label="Course Title"
        icon={<BookOpen className="w-4 h-4" />}
        placeholder="Enter course title"
        value={formData.title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
        error={errors.title}
        variant="default"
        colorScheme="primary"
        size="md"
        disabled={loading}
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-800">Course type</label>
        <div className="grid grid-cols-2 gap-2">
          {(['recorded', 'live'] as CourseType[]).map((type) => (
            <button
              key={type}
              type="button"
              disabled={loading || Boolean(course)}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  courseType: type,
                }))
              }
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                formData.courseType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              } ${course ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {type === 'live' ? 'Live course' : 'Recorded course'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {formData.courseType === 'live'
            ? 'Students enroll into batches. Add batches after creating the course.'
            : 'Self-paced course with optional announcement live sessions.'}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="shortDescription" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
          Short Description
        </label>
        <CustomEditor
          value={formData.shortDescription ?? ''}
          onChange={(data) => handleInputChange('shortDescription', data)}
          placeholder="Brief summary for cards and listings"
        />
        {errors.shortDescription && (
          <p className="text-xs text-red-600">{errors.shortDescription}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
          Course Description
        </label>
        <TipTapEditor
          value={formData.description ?? ''}
          onChange={(data) => handleInputChange('description', data)}
          placeholder="Full course description for the detail page"
        />
      </div>

      {/* Subject, grade, and Thumbnail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="subject" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
            <Tag className="w-3 h-3" style={{ color: '#7B2CBF' }} />
            Subject *
          </label>
          <select
            id="subject"
            value={(formData as CreateCourseRequest & { subjectId?: string }).subjectId || ''}
            onChange={(e) => {
              const match = subjects.find((s) => s._id === e.target.value);
              setFormData((prev) => ({
                ...prev,
                subjectId: match?._id || '',
                subjectCode: match?.code || '',
                subjectName: match?.name || '',
                category: match?.name || '',
              }));
            }}
            disabled={loading || loadingSubjects}
            className="w-full h-9 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg bg-white"
          >
            <option value="">Select a subject</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
          {loadingSubjects && (
            <p className="text-xs text-gray-500">Loading subjects...</p>
          )}
          {errors.subjectId && (
            <p className="text-xs text-red-600">{errors.subjectId}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="grade" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
            <Award className="w-3 h-3" style={{ color: '#7B2CBF' }} />
            {formData.courseType === 'live' ? 'Class / grade *' : 'Class / grade (optional)'}
          </label>
          <select
            id="grade"
            value={(formData as CreateCourseRequest & { grade?: string }).grade || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, grade: e.target.value }))
            }
            disabled={loading}
            className="w-full h-9 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg bg-white"
          >
            <option value="">Select class / grade</option>
            {BATCH_GRADES.map((g) => (
              <option key={g} value={g}>
                {formatGradeLabel(g)}
              </option>
            ))}
          </select>
          {errors.grade && (
            <p className="text-xs text-red-600">{errors.grade}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageSourceField
          label="Course thumbnail"
          value={formData.thumbnailUrl || ''}
          onChange={(url) => handleInputChange('thumbnailUrl', url)}
          disabled={loading}
          hint="Upload an image or paste a direct image link."
        />
      </div>

      {/* Instructor Selection */}
      {showInstructorField && (
        <InstructorSelector
          value={formData.instructor}
          onChange={(instructorId) => handleInputChange('instructor', instructorId)}
          label="Instructor"
          placeholder="Select an instructor"
          disabled={loading}
        />
      )}

      <div className="rounded-lg p-3" style={{
        background: "linear-gradient(135deg, rgba(123, 44, 191, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
        border: '1px solid rgba(123, 44, 191, 0.2)',
      }}>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Checkbox
              id="isPaid"
              checked={formData.isPaid}
              onCheckedChange={handlePaidToggle}
              className="w-4 h-4 border-2 data-[state=checked]:bg-[#7B2CBF] data-[state=checked]:border-[#7B2CBF]"
              style={{
                borderColor: '#7B2CBF',
              }}
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md" style={{ backgroundColor: 'rgba(123, 44, 191, 0.1)' }}>
              <TakaIcon className="w-3 h-3" style={{ color: '#7B2CBF' }} />
            </div>
            <div>
              <label htmlFor="isPaid" className="text-xs font-semibold text-gray-800 cursor-pointer">
                Paid Course
              </label>
              <p className="text-xs text-gray-600 mt-1">
                This course requires payment to access
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Fields - Only show if course is paid */}
      {formData.isPaid && (
        <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <TakaIcon className="w-4 h-4 text-green-600" />
            Pricing Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AttractiveInput
              label="Regular Price"
              icon={<TakaIcon className="w-4 h-4" />}
              type="number"
              min="0"
              step="0.01"
              value={formData.price || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              error={errors.price}
              variant="default"
              colorScheme="primary"
              size="md"
              disabled={loading}
            />

            <AttractiveInput
              label="Sale Price (Optional)"
              icon={<TakaIcon className="w-4 h-4" />}
              type="number"
              min="0"
              step="0.01"
              value={formData.salePrice || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('salePrice', parseFloat(e.target.value) || undefined)}
              placeholder="0.00"
              error={errors.salePrice}
              variant="default"
              colorScheme="primary"
              size="md"
              disabled={loading}
              helperText={formData.salePrice && formData.price && formData.salePrice < formData.price ? 
                `Discount: ${Math.round(((formData.price - formData.salePrice) / formData.price) * 100)}% off` : undefined
              }
            />

            <AttractiveInput
              label="Monthly Price (Optional)"
              icon={<TakaIcon className="w-4 h-4" />}
              type="number"
              min="0"
              step="0.01"
              value={formData.monthlyPrice || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthlyPrice', parseFloat(e.target.value) || undefined)}
              placeholder="0.00"
              error={errors.monthlyPrice}
              variant="default"
              colorScheme="primary"
              size="md"
              disabled={loading}
              helperText="Enables Monthly subscription plan option for students"
            />
          </div>
        </div>
      )}

      {/* Submit Error */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}
    </FormModal>
  );
}
