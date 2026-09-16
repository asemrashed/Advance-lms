'use client';

import { useRef, useState } from 'react';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AttractiveInput } from '@/components/ui/attractive-input';
import {
  platformQuestionsService,
  type PastPaperQuestionDraftPayload,
} from '@/services/platformQuestionsService';
import SubjectGradeSelect, {
  type SubjectGradeValue,
} from '@/components/platform-question-bank/SubjectGradeSelect';
import SubjectAccessPriceField from '@/components/platform-question-bank/SubjectAccessPriceField';
import { parsePaperFilename, resolveDisplayQid } from '@/lib/pastPaperCode';
import { PdfFilePicker } from '@/components/ui/PdfFilePicker';
import { LuSparkles, LuSave, LuUpload } from 'react-icons/lu';

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'input' | 'preview';

export default function ProcessPastPaperModal({ open, onClose, onSuccess }: Props) {
  const qpRef = useRef<HTMLInputElement>(null);
  const msRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('input');
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);
  const [paperCode, setPaperCode] = useState('');
  const [subjectGrade, setSubjectGrade] = useState<SubjectGradeValue>({
    subjectId: '',
    subjectCode: '',
    subjectName: '',
    grade: '',
  });
  const [qbAccessPrice, setQbAccessPrice] = useState('');
  const [qpPublicId, setQpPublicId] = useState<string | null>(null);
  const [msPublicId, setMsPublicId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PastPaperQuestionDraftPayload[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyMissing, setKeyMissing] = useState(false);

  const reset = () => {
    setStep('input');
    setQpFile(null);
    setMsFile(null);
    setPaperCode('');
    setSubjectGrade({ subjectId: '', subjectCode: '', subjectName: '', grade: '' });
    setQpPublicId(null);
    setMsPublicId(null);
    setPreview([]);
    setSelected(new Set());
    setError('');
    setKeyMissing(false);
    setLoading(false);
    if (qpRef.current) qpRef.current.value = '';
    if (msRef.current) msRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const uploadOne = async (file: File): Promise<string | null> => {
    const res = await platformQuestionsService.uploadPdf(file, 'lms/platform-question-bank/pastpaper');
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.pdf?.publicId) {
      setError(json.error || 'PDF upload failed');
      return null;
    }
    return json.pdf.publicId as string;
  };

  const runProcess = async () => {
    setError('');
    setKeyMissing(false);
    if (!qpFile || !msFile) {
      setError('Choose both a question paper and a mark scheme PDF');
      return;
    }
    if (!subjectGrade.subjectId) {
      setError('Select a subject (add subjects under Admin → Subjects if missing)');
      return;
    }
    setLoading(true);
    try {
      const qpId = qpPublicId || (await uploadOne(qpFile));
      if (!qpId) return;
      setQpPublicId(qpId);
      const msId = msPublicId || (await uploadOne(msFile));
      if (!msId) return;
      setMsPublicId(msId);

      const res = await platformQuestionsService.processPastPaper({
        qpPublicId: qpId,
        msPublicId: msId,
        paperCode: paperCode.trim() || undefined,
        qpFilename: qpFile.name,
        subjectId: subjectGrade.subjectId,
        subjectCode: subjectGrade.subjectCode,
        subjectName: subjectGrade.subjectName,
        grade: subjectGrade.grade || undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.code === 'ANTHROPIC_API_KEY_MISSING') setKeyMissing(true);
        setError(json.error || 'Processing failed');
        return;
      }
      const questions: PastPaperQuestionDraftPayload[] = json.data?.questions || [];
      setPreview(questions);
      setSelected(new Set(questions.map((_, i) => i)));
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const saveBatch = async () => {
    const toSave = preview.filter((_, i) => selected.has(i));
    if (!toSave.length) {
      setError('Select at least one question to save');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await platformQuestionsService.savePastPaperBatch({
        questions: toSave,
        qpPublicId: qpPublicId || undefined,
        msPublicId: msPublicId || undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Save failed');
        return;
      }
      handleClose();
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const toggleIndex = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const incompleteCount = preview.filter(
    (q) => q.status === 'incomplete' || (q.hasDiagram && !q.diagramUrl),
  ).length;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Process past paper (QP + MS)"
      description="Upload a question paper and its mark scheme — Claude reads both and extracts topical questions"
      size="2xl"
      footer={
        step === 'input' ? (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button disabled={loading || !qpFile || !msFile} onClick={runProcess}>
              <LuSparkles className="mr-1" size={16} />
              {loading ? 'Processing…' : 'Process with AI'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep('input')}>
              Back
            </Button>
            <Button disabled={loading || selected.size === 0} onClick={saveBatch}>
              <LuSave className="mr-1" size={16} />
              {loading ? 'Saving…' : `Save ${selected.size} question(s)`}
            </Button>
          </>
        )
      }
    >
      {keyMissing && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          ANTHROPIC_API_KEY is not set. Add it to <code className="text-xs">.env.local</code> and restart the server.
        </p>
      )}
      {error && !keyMissing && (
        <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {step === 'input' ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Paper code</label>
            <AttractiveInput
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value)}
              placeholder="e.g. 0606_s24_21 or MJ 2024 PP2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-filled from the QP filename when named like 0606_s24_qp_21.pdf. Used for QID
              (e.g. 0606_s24_21_Q1a).
            </p>
          </div>

          <SubjectGradeSelect
            value={subjectGrade}
            onChange={setSubjectGrade}
            paperCode={paperCode}
            required
          />
          <p className="text-xs text-muted-foreground -mt-1">
            Select subject first — Haiku uses that subject&apos;s chapters as topics (does not invent topics).
          </p>
          <SubjectAccessPriceField
            subjectId={subjectGrade.subjectId || undefined}
            value={qbAccessPrice}
            onChange={setQbAccessPrice}
            disabled={loading}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <PdfFilePicker
              label="Question paper (QP) PDF"
              file={qpFile}
              inputRef={qpRef}
              onFileChange={(file) => {
                setQpFile(file);
                setQpPublicId(null);
                setError('');
                if (file) {
                  const fromName = parsePaperFilename(file.name);
                  if (fromName) setPaperCode(fromName);
                }
              }}
            />
            <PdfFilePicker
              label="Mark scheme (MS) PDF"
              file={msFile}
              inputRef={msRef}
              onFileChange={(file) => {
                setMsFile(file);
                setMsPublicId(null);
                setError('');
              }}
            />
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <LuUpload size={12} /> Both PDFs are uploaded, then sent to Claude vision as documents.
          </p>
        </div>
      ) : (
        <div className="scrollbar-hide max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          <p className="text-sm text-muted-foreground">
            {preview.length} question(s) extracted
            {incompleteCount > 0 ? ` — ${incompleteCount} need a diagram before they are complete` : ''}.
            Uncheck any you do not want to save.
          </p>
          {preview.map((q, i) => {
            const qid =
              resolveDisplayQid({
                qid: q.qid,
                subjectCode: q.subjectCode,
                session: q.session,
                year: q.year,
                paper: q.paper,
                questionNumber: q.questionNumber,
              }) || 'Past paper';

            return (
            <div key={i} className="flex gap-2 rounded-lg border p-3">
              <Checkbox className="mt-1" checked={selected.has(i)} onCheckedChange={() => toggleIndex(i)} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 font-mono">{qid}</p>
                <p className="line-clamp-3 text-sm font-medium">{q.questionText}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {q.topic || `Topic ${q.topicNumber ?? '?'}`}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {DIFFICULTY_LABEL[q.difficulty ?? 2] || q.difficulty}
                  </Badge>
                  {q.marks != null && (
                    <Badge variant="outline" className="text-xs">
                      {q.marks} marks
                    </Badge>
                  )}
                  {(q.status === 'incomplete' || (q.hasDiagram && !q.diagramUrl)) && (
                    <Badge className="bg-amber-600 text-xs hover:bg-amber-600">Missing diagram</Badge>
                  )}
                </div>
                {q.msText && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    <span className="font-medium">MS:</span> {q.msText}
                  </p>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
