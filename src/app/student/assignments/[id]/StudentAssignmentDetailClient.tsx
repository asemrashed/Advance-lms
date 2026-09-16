'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WelcomeSection from '@/components/WelcomeSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import {
  LuFileText as LuFileText,
  LuUpload as Upload,
  LuCalendar as Calendar,
  LuSend as Send,
  LuTriangleAlert as AlertCircle,
  LuCheck as CheckCircle2,
} from 'react-icons/lu';
import { Assignment, AssignmentMcqQuestion } from '@/types/assignment';
import { studentAssignmentService } from '@/services/studentAssignmentService';
import { PdfSubmissionAnnotator } from '@/components/assignments/PdfSubmissionAnnotator';
import { MathText, RichHtml } from '@/components/ui/MathText';

function isPdfAssignmentType(type?: string) {
  return type === 'pdf' || type === 'file_upload';
}

function isPdfFile(file?: { url?: string; name?: string; type?: string } | null) {
  if (!file?.url) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || file.url).toLowerCase();
  return type.includes('pdf') || name.endsWith('.pdf');
}

export default function StudentAssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<any | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});

  const mcqQuestions = useMemo(
    () => (assignment?.mcqQuestions || []) as AssignmentMcqQuestion[],
    [assignment?.mcqQuestions],
  );

  const gradedPdfFile = useMemo(() => {
    if (!latestSubmission || latestSubmission.status !== 'graded') return null;
    const files = Array.isArray(latestSubmission.files) ? latestSubmission.files : [];
    return files.find((f: { url?: string; name?: string; type?: string }) => isPdfFile(f)) || null;
  }, [latestSubmission]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const res = await studentAssignmentService.getAssignment(assignmentId);
      const data = await res.json();
      if (res.ok) {
        const nextAssignment = data.data?.assignment || data.assignment || null;
        setAssignment(nextAssignment);
        const submission = data.data?.latestSubmission || null;
        setLatestSubmission(submission);
        setAttemptsRemaining(Number(data.data?.attemptsRemaining || 0));
        if (submission?.content) {
          setContent(String(submission.content));
        }
        if (Array.isArray(submission?.answers)) {
          const restored: Record<string, string> = {};
          for (const ans of submission.answers) {
            if (ans?.questionId != null) restored[String(ans.questionId)] = String(ans.answer ?? '');
          }
          setMcqAnswers(restored);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const handleSubmit = async () => {
    if (!assignment) return;
    setError(null);

    try {
      setSubmitting(true);
      let res: Response;

      if (assignment.type === 'mcq') {
        if (mcqQuestions.length === 0) {
          setError('This assignment has no questions yet.');
          return;
        }
        const unanswered = mcqQuestions.filter((q) => mcqAnswers[q.id] === undefined || mcqAnswers[q.id] === '');
        if (unanswered.length > 0) {
          setError('Please answer all questions before submitting.');
          return;
        }
        res = await studentAssignmentService.submitAssignment(assignment._id, {
          method: 'POST',
          body: JSON.stringify({
            answers: mcqQuestions.map((q) => ({
              questionId: q.id,
              answer: mcqAnswers[q.id],
            })),
          }),
        });
      } else if (isPdfAssignmentType(assignment.type)) {
        if (!file) {
          setError('Please upload a PDF file before submitting.');
          return;
        }
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
          setError('Only PDF files are allowed.');
          return;
        }
        const maxMb = Number(assignment.maxFileSize || 50);
        if (file.size > maxMb * 1024 * 1024) {
          setError(
            `PDF must be ${maxMb}MB or smaller (your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
          );
          return;
        }
        const uploadForm = new FormData();
        uploadForm.append('files', file);
        uploadForm.append('assignmentType', assignment.type);
        const uploadRes = await studentAssignmentService.uploadAssignmentFile(uploadForm);
        let uploadJson: { error?: string; files?: unknown } = {};
        try {
          uploadJson = await uploadRes.json();
        } catch {
          setError(
            uploadRes.status === 413
              ? `Upload too large. Max ${maxMb}MB PDF.`
              : 'File upload failed. Please try again.',
          );
          return;
        }
        if (!uploadRes.ok) {
          setError(uploadJson?.error || 'File upload failed');
          return;
        }
        res = await studentAssignmentService.submitAssignment(assignment._id, {
          method: 'POST',
          body: JSON.stringify({ files: uploadJson.files }),
        });
      } else {
        if (!content.trim()) {
          setError('Please provide your answer before submitting.');
          return;
        }
        const body: Record<string, unknown> = { content: content.trim() };
        res = await studentAssignmentService.submitAssignment(assignment._id, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (res.ok) {
        await fetchAssignment();
        setFile(null);
        setError(null);
      } else {
        setError(data?.error || 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-3 sm:p-5">
        <WelcomeSection title="Submit Assignment" description="Provide your response and any required attachments" />
        {loading || !assignment ? (
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="bg-gray-200 h-6 w-1/3 rounded mb-4" />
              <div className="bg-gray-200 h-4 w-2/3 rounded" />
            </CardContent>
          </Card>
        ) : (
          <Card className="mx-auto max-w-5xl overflow-hidden border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LuFileText className="w-5 h-5 text-primary" />
                {assignment.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button type="button" variant="outline" onClick={() => router.replace('/student/assignments')}>
                  Back to Assignments
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Course</p>
                  <p className="font-semibold text-gray-900">{typeof assignment.course === 'string' ? 'General course' : assignment.course?.title || 'General course'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Marks</p>
                  <p className="font-semibold text-gray-900">{assignment.totalMarks}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const now = new Date();
                  const start = assignment.startDate ? new Date(assignment.startDate) : null;
                  const due = assignment.dueDate ? new Date(assignment.dueDate) : null;
                  let label = 'Active';
                  let cls = 'bg-green-100 text-green-800';
                  if (start && start > now) {
                    label = 'Upcoming';
                    cls = 'bg-yellow-100 text-yellow-800';
                  } else if (due && due < now) {
                    label = 'Overdue';
                    cls = 'bg-red-100 text-red-800';
                  }
                  return (
                    <Badge variant="secondary" className={cls}>
                      {label}
                    </Badge>
                  );
                })()}
                <Badge variant="outline">{assignment.type.replace('_', ' ').toUpperCase()}</Badge>
              </div>

              {assignment.description && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <RichHtml
                    className="prose prose-sm max-w-none text-gray-900 prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5"
                    html={assignment.description}
                  />
                </div>
              )}

              {assignment.attachments && assignment.attachments.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Assignment resources</p>
                  <div className="flex flex-wrap gap-2">
                    {assignment.attachments.map((attachment) => (
                      <a key={`${attachment.url}-${attachment.name}`} href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5">
                        <LuFileText className="h-4 w-4" />{attachment.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {latestSubmission && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Latest submission: {latestSubmission.status || 'submitted'}
                  </div>
                  <div className="text-sm text-gray-700">
                    Attempt #{latestSubmission.attemptNumber || 1}
                    {latestSubmission.submittedAt
                      ? ` • Submitted ${new Date(latestSubmission.submittedAt).toLocaleString()}`
                      : ''}
                  </div>
                  {typeof latestSubmission.score === 'number' && (
                    <div className="text-sm text-gray-700">
                      Score: {latestSubmission.score}/{latestSubmission.maxScore}
                      {typeof latestSubmission.percentageScore === 'number'
                        ? ` (${latestSubmission.percentageScore}%)`
                        : ''}
                    </div>
                  )}
                  {latestSubmission.feedback && (
                    <div className="text-sm text-gray-700">Feedback: {latestSubmission.feedback}</div>
                  )}
                  {Array.isArray(latestSubmission.files) && latestSubmission.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {latestSubmission.files.map((submittedFile: { url: string; name: string }) => (
                        <a key={submittedFile.url} href={submittedFile.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                          {submittedFile.name}
                        </a>
                      ))}
                    </div>
                  )}
                  {gradedPdfFile?.url ? (
                    <div className="space-y-2 border-t border-emerald-200 pt-3">
                      <p className="text-sm font-semibold text-emerald-900">
                        Graded PDF
                        {latestSubmission.pdfAnnotations?.layers?.some(
                          (layer: { strokes?: unknown[] }) =>
                            Array.isArray(layer.strokes) && layer.strokes.length > 0,
                        )
                          ? ' (with instructor marks)'
                          : ''}
                      </p>
                      <PdfSubmissionAnnotator
                        key={`${gradedPdfFile.url}-${latestSubmission._id || 'graded'}`}
                        pdfUrl={gradedPdfFile.url}
                        value={latestSubmission.pdfAnnotations || null}
                        readOnly
                      />
                    </div>
                  ) : null}
                </div>
              )}

              {attemptsRemaining > 0 ? (
                <div className="space-y-4">
                  {assignment.type === 'mcq' ? (
                    <div className="space-y-4">
                      {mcqQuestions.map((q, index) => (
                        <div key={q.id} className="rounded-lg border p-4 space-y-3">
                          <p className="font-medium">
                            {index + 1}. <MathText text={q.question} />{' '}
                            <span className="text-sm text-muted-foreground">({q.marks} marks)</span>
                          </p>
                          <div className="space-y-2">
                            {q.options.map((opt, optIndex) => (
                              <label key={`${q.id}-${optIndex}`} className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`mcq-${q.id}`}
                                  checked={mcqAnswers[q.id] === String(optIndex)}
                                  onChange={() =>
                                    setMcqAnswers((prev) => ({ ...prev, [q.id]: String(optIndex) }))
                                  }
                                />
                                <MathText text={opt} />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isPdfAssignmentType(assignment.type) ? (
                    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                      <label className="mb-2 block text-sm font-semibold">
                        <Upload className="mr-1 inline h-4 w-4 text-primary" />
                        Upload PDF *
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        PDF only. Max {assignment.maxFileSize || 50}MB.
                      </p>
                    </div>
                  ) : (
                    <>
                      {assignment.type === 'project' || assignment.type === 'presentation' ? (
                        <AttractiveTextarea
                          label="Submission URL"
                          placeholder="Paste your project/presentation link"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <AttractiveTextarea
                          label={assignment.type === 'essay' ? 'Your Essay' : 'Your Answer'}
                          placeholder="Write your response here..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={8}
                        />
                      )}
                    </>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">{attemptsRemaining} attempt(s) remaining</p>
                    <Button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                      <Send className="w-4 h-4" />
                      Submit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  You have reached the maximum number of attempts for this assignment.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </StudentRoleShell>
  );
}
