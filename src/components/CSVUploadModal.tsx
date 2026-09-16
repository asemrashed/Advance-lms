'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import FormModal from '@/components/ui/form-modal';
import {
  LuUpload as Upload,
  LuFileText as LuFileText,
  LuDownload as Download,
  LuTriangleAlert as AlertCircle,
  LuCheck as CheckCircle2,
  LuX as X,
} from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import {
  buildExamQuestionsTemplateCsv,
  parseExamQuestionsCsv,
  type ExamCsvParsedQuestion,
  type ExamCsvQuestionType,
} from '@/lib/examQuestionsCsv';

interface CSVUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (questions: any[]) => void;
  examId?: string;
  examType?: 'mcq' | 'written' | 'mixed';
}

export default function CSVUploadModal({
  open,
  onClose,
  onSuccess,
  examId,
  examType,
}: CSVUploadModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ExamCsvParsedQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultType: ExamCsvQuestionType | undefined =
    examType === 'mcq' || examType === 'written' ? examType : undefined;

  const resetForm = () => {
    setFile(null);
    setParsedQuestions([]);
    setErrors([]);
    setPreviewMode(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setErrors(['Please select a valid CSV file']);
      return;
    }
    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      try {
        const parsed = parseExamQuestionsCsv(text, { defaultType });
        setParsedQuestions(parsed.questions);
        setErrors(parsed.errors);
        setPreviewMode(true);
      } catch (err) {
        setParsedQuestions([]);
        setErrors([err instanceof Error ? err.message : 'Failed to parse CSV']);
        setPreviewMode(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const canImport = previewMode && parsedQuestions.length > 0 && errors.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canImport) {
      setErrors((prev) =>
        prev.length ? prev : ['Fix all row errors before importing'],
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questions: parsedQuestions,
          exam: examId,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        onSuccess(data.data);
        handleClose();
      } else {
        setErrors([data.error || 'Failed to create questions']);
      }
    } catch {
      setErrors(['Failed to upload questions']);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildExamQuestionsTemplateCsv(defaultType)], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam_questions_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      onSubmit={previewMode ? handleSubmit : (e: React.FormEvent) => e.preventDefault()}
      title="Upload questions (CSV)"
      description={
        defaultType
          ? `All imported questions will be ${defaultType}; no type column needed`
          : 'Simple format with a type column for each question'
      }
      submitText={canImport ? `Import ${parsedQuestions.length} questions` : undefined}
      loading={loading}
      size="2xl"
      submitVariant="primary"
    >
      <div className="space-y-5">
        {!previewMode ? (
          <>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <h3 className="mb-1 text-base font-semibold">Upload CSV file</h3>
              <p className="mb-4 text-sm text-gray-600">
                {defaultType
                  ? `Question type is fixed as ${defaultType} by this exam.`
                  : 'Choose a type for every question.'}{' '}
                Invalid rows must be fixed before import.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose CSV
                </Button>
                <Button type="button" variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download template
                </Button>
              </div>
              {file ? (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-700">
                  <LuFileText className="h-4 w-4" />
                  {file.name}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <p className="mb-2 font-semibold">Required columns</p>
              <code className="block break-all rounded bg-white px-2 py-1.5 text-xs">
                {defaultType === 'written'
                  ? 'question,marks,answer'
                  : defaultType === 'mcq'
                    ? 'question,marks,answer,option_a,option_b,option_c,option_d'
                    : 'question,type,marks,answer,option_a,option_b,option_c,option_d'}
              </code>
              <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600">
                {!defaultType ? (
                  <li>
                    <strong>type:</strong> mcq · written · true_false · fill_blank · essay
                  </li>
                ) : null}
                <li>
                  <strong>MCQ answer:</strong> A–D or exact option text
                </li>
                <li>
                  <strong>true_false answer:</strong> true or false
                </li>
                <li>
                  <strong>written/essay:</strong> put the model answer in <code>answer</code>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Preview</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewMode(false)}>
                <X className="mr-1 h-4 w-4" />
                Change file
              </Button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {parsedQuestions.map((q, index) => (
                <div key={`${q.question}-${index}`} className="rounded-lg border p-3">
                  <div className="mb-1 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {q.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {q.marks} marks
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-800">{q.question}</p>
                  {q.options?.length ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Options: {q.options.map((o) => (o.isCorrect ? `✓${o.text}` : o.text)).join(' · ')}
                    </p>
                  ) : null}
                  {q.correctAnswer ? (
                    <p className="mt-1 text-xs text-slate-500">Answer: {q.correctAnswer}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="mb-1 text-sm font-semibold text-red-800">
                  {previewMode ? 'Fix these rows before importing' : 'Errors'}
                </p>
                <ul className="space-y-0.5 text-xs text-red-700">
                  {errors.map((err) => (
                    <li key={err}>• {err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {canImport ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Ready to import {parsedQuestions.length} question
            {parsedQuestions.length === 1 ? '' : 's'}
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
