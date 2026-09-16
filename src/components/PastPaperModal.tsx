'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import FormModal from '@/components/ui/form-modal';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { AttractiveSelect } from '@/components/ui/attractive-select';
import PDFUpload from '@/components/PDFUpload';
import { LuFileText as LuFileText, LuCalendar as Calendar, LuAward as Award, LuUsers as Users, LuTriangleAlert as AlertCircle, LuCheck as CheckCircle, LuX as X } from 'react-icons/lu';
import { PastPaper, CreatePastPaperDto } from '@/types/past-paper';
import {
  ResourceSubjectFields,
  type ResourceSubjectValue,
} from '@/components/resources/ResourceSubjectFields';
import {
  isPastPaperSession,
  PAST_PAPER_SESSION_OPTIONS,
} from '@/lib/pastPaperSessions';

interface PastPaperModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pastPaper?: PastPaper | null;
}

export default function PastPaperModal({ open, onClose, onSuccess, pastPaper }: PastPaperModalProps) {
  const isEdit = !!pastPaper;
  
  // Form data state
  const [formData, setFormData] = useState<CreatePastPaperDto>({
    subjectId: '',
    sessionName: '',
    year: new Date().getFullYear(),
    subject: '',
    examType: '',
    questionPaperUrl: '',
    marksPdfUrl: '',
    workSolutionUrl: '',
    description: '',
    tags: '',
    isActive: true
  });

  const [subjectScope, setSubjectScope] = useState<ResourceSubjectValue>({});

  // File upload states
  const [questionPaperFile, setQuestionPaperFile] = useState<File | null>(null);
  const [marksPdfFile, setMarksPdfFile] = useState<File | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({
    questionPaper: 'idle',
    marksPdf: 'idle',
  });

  const sessionOptions = useMemo(() => {
    if (
      formData.sessionName &&
      !isPastPaperSession(formData.sessionName)
    ) {
      return [
        {
          value: formData.sessionName,
          label: `${formData.sessionName} (choose March/June/November)`,
        },
        ...PAST_PAPER_SESSION_OPTIONS,
      ];
    }
    return PAST_PAPER_SESSION_OPTIONS;
  }, [formData.sessionName]);

  useEffect(() => {
    if (!open) {
      setFormData({
        subjectId: '',
        sessionName: '',
        year: new Date().getFullYear(),
        subject: '',
        examType: '',
        questionPaperUrl: '',
        marksPdfUrl: '',
        workSolutionUrl: '',
        description: '',
        tags: '',
        isActive: true
      });
      setSubjectScope({});
      setErrors({});
      setQuestionPaperFile(null);
      setMarksPdfFile(null);
      setUploadProgress(0);
      setUploadStatus({
        questionPaper: 'idle',
        marksPdf: 'idle',
      });
      return;
    }

    if (isEdit && pastPaper) {
      const subId = pastPaper.subjectId
        ? typeof pastPaper.subjectId === 'object'
          ? String((pastPaper.subjectId as any)._id || pastPaper.subjectId)
          : String(pastPaper.subjectId)
        : '';
      setFormData({
        subjectId: subId,
        subjectCode: pastPaper.subjectCode,
        sessionName: pastPaper.sessionName,
        year: pastPaper.year,
        subject: pastPaper.subject,
        grade: pastPaper.grade,
        examType: pastPaper.examType,
        questionPaperUrl: pastPaper.questionPaperUrl || '',
        marksPdfUrl: pastPaper.marksPdfUrl || '',
        workSolutionUrl: pastPaper.workSolutionUrl || '',
        description: pastPaper.description || '',
        tags: pastPaper.tags || '',
        isActive: pastPaper.isActive ?? true
      });
      setSubjectScope({
        subjectId: subId || undefined,
        subjectName: pastPaper.subject,
        subjectCode: pastPaper.subjectCode,
        grade: pastPaper.grade,
      });
      setErrors({});
    }
  }, [open, isEdit, pastPaper]);

  // Handle input changes
  const handleInputChange = (field: keyof CreatePastPaperDto, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubjectChange = (next: ResourceSubjectValue) => {
    setSubjectScope((current) => ({ ...current, ...next }));
    setFormData((prev) => ({
      ...prev,
      ...(next.subjectId !== undefined ? { subjectId: next.subjectId || '' } : {}),
      ...(next.subjectName !== undefined ? { subject: next.subjectName || '' } : {}),
      ...(next.subjectCode !== undefined ? { subjectCode: next.subjectCode } : {}),
      ...(next.grade !== undefined ? { grade: next.grade } : {}),
    }));
    if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
  };

  // Handle file uploads
  const handleFileUpload = async (file: File, type: 'questionPaper' | 'marksPdf') => {
    try {
      setUploadStatus(prev => ({ ...prev, [type]: 'uploading' }));
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', `lms/past-papers/${type.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
      uploadFormData.append('description', `${type} - ${formData.sessionName} ${formData.year} ${formData.subject}`);

      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: uploadFormData
      });

      const result = await response.json();

      if (result.success && result.pdf) {
        const urlField = `${type}Url` as keyof CreatePastPaperDto;
        handleInputChange(urlField, result.pdf.url);
        setUploadStatus(prev => ({ ...prev, [type]: 'success' }));
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error(`Upload error for ${type}:`, error);
      setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File, type: 'questionPaper' | 'marksPdf') => {
    if (file.type !== 'application/pdf') {
      setErrors(prev => ({ ...prev, [type]: 'Please select a PDF file' }));
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setErrors(prev => ({ ...prev, [type]: 'File size must be less than 50MB' }));
      return;
    }

    setErrors(prev => ({ ...prev, [type]: '' }));
    
    if (type === 'questionPaper') setQuestionPaperFile(file);
    if (type === 'marksPdf') setMarksPdfFile(file);

    handleFileUpload(file, type);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subjectId && !formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.sessionName.trim()) {
      newErrors.sessionName = 'Session is required';
    } else if (!isPastPaperSession(formData.sessionName.trim())) {
      newErrors.sessionName = 'Session must be March, June, or November';
    }

    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'Year must be between 1900 and next year';
    }

    if (!formData.examType.trim()) {
      newErrors.examType = 'Exam variant is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      const url = isEdit ? `/api/past-papers/${pastPaper._id}` : '/api/past-papers';
      const method = isEdit ? 'PUT' : 'POST';

      console.log('Submitting past paper:', formData);

      const payload = {
        ...formData,
        subjectId: formData.subjectId || subjectScope.subjectId,
        subject: formData.subject || subjectScope.subjectName,
        subjectCode: formData.subjectCode || subjectScope.subjectCode,
        grade: formData.grade || subjectScope.grade,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to save past paper';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Past paper saved successfully:', result);
      onSuccess();
    } catch (error) {
      console.error('Error saving past paper:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save past paper' });
    } finally {
      setLoading(false);
    }
  };

  // Get upload status icon
  const getUploadStatusIcon = (type: 'questionPaper' | 'marksPdf') => {
    const status = uploadStatus[type];
    switch (status) {
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#7B2CBF' }} />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Past Paper' : 'Add New Past Paper'}
      description={isEdit ? 'Update past paper information and files' : 'Create a new past paper with question papers and marks PDFs'}
      onSubmit={handleSubmit}
      loading={loading}
      size="2xl"
      formId="past-paper-form"
      submitText={isEdit ? 'Update Past Paper' : 'Create Past Paper'}
    >
      <div className="space-y-6 pr-1">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <LuFileText className="w-5 h-5" style={{ color: '#7B2CBF' }} />
            Basic Information
          </h3>
          
          <ResourceSubjectFields
            value={subjectScope}
            onChange={handleSubjectChange}
            requireChapter={false}
          />
          {errors.subject && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.subject}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AttractiveSelect
              label="Session"
              icon="calendar"
              placeholder="Select session"
              value={formData.sessionName}
              onChange={(e) => handleInputChange('sessionName', e.target.value)}
              error={errors.sessionName}
              options={sessionOptions}
              variant="default"
              colorScheme="primary"
              size="md"
            />

            <AttractiveInput
              label="Year"
              icon={<Calendar className="w-4 h-4" />}
              type="number"
              placeholder="2024"
              value={formData.year}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('year', parseInt(e.target.value) || '')}
              error={errors.year}
              variant="default"
              colorScheme="primary"
              size="md"
            />

            <AttractiveInput
              label="Exam variant"
              icon={<Award className="w-4 h-4" />}
              placeholder="e.g. Paper 1, Variant 2"
              value={formData.examType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('examType', e.target.value)}
              error={errors.examType}
              variant="default"
              colorScheme="primary"
              size="md"
              helperText="Enter the exam variant manually"
            />
          </div>
        </div>

        {/* File Uploads */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Paper Files
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Question Paper */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <LuFileText className="w-4 h-4 text-purple-600" />
                Question Paper (QP)
                {getUploadStatusIcon('questionPaper')}
              </label>
              <PDFUpload
                currentPDF={formData.questionPaperUrl}
                onPDFChange={(url) => handleInputChange('questionPaperUrl', url)}
                onPDFRemove={() => handleInputChange('questionPaperUrl', '')}
                onError={(error) => setErrors(prev => ({ ...prev, questionPaper: error }))}
                size="sm"
                folder="lms/past-papers/question-papers"
                description={`Question paper - ${formData.sessionName} ${formData.year} ${formData.subject}`}
              />
              {errors.questionPaper && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  {errors.questionPaper}
                </div>
              )}
            </div>

            {/* Mark Scheme */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Award className="w-4 h-4 text-orange-600" />
                Mark Scheme (MS)
                {getUploadStatusIcon('marksPdf')}
              </label>
              <PDFUpload
                currentPDF={formData.marksPdfUrl}
                onPDFChange={(url) => handleInputChange('marksPdfUrl', url)}
                onPDFRemove={() => handleInputChange('marksPdfUrl', '')}
                onError={(error) => setErrors(prev => ({ ...prev, marksPdf: error }))}
                size="sm"
                folder="lms/past-papers/marks-pdfs"
                description={`Mark scheme - ${formData.sessionName} ${formData.year} ${formData.subject}`}
              />
              {errors.marksPdf && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  {errors.marksPdf}
                </div>
              )}
            </div>
          </div>

          {errors.papers && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-md">
              <AlertCircle className="w-3 h-3" />
              {errors.papers}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleInputChange('isActive', e.target.checked)}
            className="w-4 h-4 bg-gray-100 border-gray-300 rounded"
            style={{
              accentColor: '#7B2CBF',
            }}
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Active (visible to students)
          </label>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="w-4 h-4" />
            {errors.submit}
          </div>
        )}
      </div>
    </FormModal>
  );
}
