'use client';

import { useEffect, useState } from 'react';
import FormModal from '@/components/ui/form-modal';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AttractiveSelect } from '@/components/ui/attractive-select';
import { BATCH_GRADES } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';
import { parseChapterLines } from '@/lib/subjectChapters';
import type { Subject, SubjectChapter, SubjectComponent } from '@/types/subject';
import { LuArrowLeft, LuArrowRight, LuCheck, LuPlus, LuTrash2 } from 'react-icons/lu';

type ComponentDraft = {
  _id?: string;
  name: string;
  type: 'mcq' | 'written';
};

interface Props {
  open: boolean;
  subject?: Subject | null;
  onClose: () => void;
  onSuccess: () => void;
  createSubject?: (data: {
    name: string;
    code: string;
    grade?: string;
    chapters: SubjectChapter[];
    components: { name: string; type: 'mcq' | 'written'; order: number; _id?: string }[];
    qbAccessPrice?: number;
    isActive?: boolean;
  }) => Promise<Subject | null>;
  updateSubject?: (id: string, data: Record<string, unknown>) => Promise<Subject | null>;
}

const defaultComponents = (): ComponentDraft[] => [
  { name: 'Paper 1', type: 'mcq' },
  { name: 'Paper 2', type: 'written' },
];

export default function SubjectModal({
  open,
  subject,
  onClose,
  onSuccess,
  createSubject,
  updateSubject,
}: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [grade, setGrade] = useState('');
  const [qbAccessPrice, setQbAccessPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [chapters, setChapters] = useState<string[]>(['']);
  const [components, setComponents] = useState<ComponentDraft[]>(defaultComponents());
  const [pasteBlock, setPasteBlock] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setCode(subject.code);
      setGrade(subject.grade || '');
      setQbAccessPrice(
        subject.qbAccessPrice != null && Number.isFinite(subject.qbAccessPrice)
          ? String(subject.qbAccessPrice)
          : '',
      );
      setIsActive(subject.isActive);
      const names = (subject.chapters || [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c) => c.name);
      setChapters(names.length ? names : ['']);
      const comps = (subject.components || [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c: SubjectComponent) => ({
          _id: c._id,
          name: c.name,
          type: c.type,
        }));
      setComponents(comps.length ? comps : defaultComponents());
    } else {
      setName('');
      setCode('');
      setGrade('');
      setQbAccessPrice('');
      setIsActive(true);
      setChapters(['']);
      setComponents(defaultComponents());
    }
    setPasteBlock('');
    setStep(1);
    setError('');
  }, [subject, open]);

  const buildChaptersPayload = (): SubjectChapter[] => {
    const fromRows = chapters.map((n) => n.trim()).filter(Boolean);
    if (fromRows.length) {
      return fromRows.map((n, i) => ({ name: n, order: i + 1 }));
    }
    return parseChapterLines(pasteBlock);
  };

  const buildComponentsPayload = () => {
    return components
      .map((c, i) => ({
        ...(c._id ? { _id: c._id } : {}),
        name: c.name.trim(),
        type: c.type,
        order: i + 1,
      }))
      .filter((c) => c.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subject name is required');
      return;
    }
    if (!code.trim()) {
      setError('Subject code is required (e.g. 4024)');
      return;
    }
    if (!/^[A-Za-z0-9/_-]{2,15}$/.test(code.trim())) {
      setError('Subject code must be 2–15 letters, numbers, or slashes (e.g. 2345/2)');
      return;
    }
    if (!grade) {
      setError('Select a class / grade');
      return;
    }
    if (step === 1) {
      setError('');
      setStep(2);
      return;
    }
    const chaptersPayload = buildChaptersPayload();
    if (!chaptersPayload.length) {
      setError('Add at least one chapter');
      return;
    }
    const componentsPayload = buildComponentsPayload();
    if (!componentsPayload.length) {
      setError('Add at least one exam component (MCQ or Written)');
      return;
    }
    if (componentsPayload.some((c) => c.type !== 'mcq' && c.type !== 'written')) {
      setError('Each component must be MCQ or Written');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const priceRaw = qbAccessPrice.trim();
      const priceNum = priceRaw === '' ? undefined : Number(priceRaw);
      if (priceRaw !== '' && (!Number.isFinite(priceNum) || (priceNum as number) < 0)) {
        setError('Access price must be a valid number (BDT)');
        setLoading(false);
        return;
      }
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        grade: grade.trim() || undefined,
        chapters: chaptersPayload,
        components: componentsPayload,
        qbAccessPrice: priceNum,
        isActive,
      };
      const result = subject
        ? await updateSubject?.(subject._id, payload)
        : await createSubject?.(payload);
      if (!result) {
        setError('Failed to save subject');
        return;
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={subject ? 'Edit subject' : 'Add subject'}
      description={
        step === 1
          ? 'Enter the subject details to continue.'
          : 'Define exam components, chapters, then save.'
      }
      submitText={
        step === 1 ? 'Continue' : subject ? 'Update subject' : 'Create subject'
      }
      loading={loading}
      size="lg"
      formId="subject-form"
      submitIcon={step === 1 ? <LuArrowRight className="w-5 h-5" /> : undefined}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-label="Subject form progress">
          <div className="flex items-center gap-2 text-primary">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {step === 2 ? <LuCheck size={16} /> : '1'}
            </span>
            <span className="text-sm font-medium">Subject details</span>
          </div>
          <div className="h-px w-8 bg-border sm:w-16" />
          <div className={`flex items-center justify-end gap-2 ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </span>
            <span className="text-sm font-medium">Components & chapters</span>
          </div>
        </div>

        {step === 1 ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Subject name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mathematics"
                disabled={loading}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Subject code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 4024 or 2345/2"
                disabled={loading}
                maxLength={15}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Syllabus / paper code used in past papers and filtering.
              </p>
            </div>
            <AttractiveSelect
              label="Class / grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Select class / grade"
              options={BATCH_GRADES.map((g) => ({
                value: g,
                label: formatGradeLabel(g),
              }))}
              icon="award"
            />
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => {
                setError('');
                setStep(1);
              }}
              className="w-fit border-primary text-primary hover:bg-primary/10 hover:text-primary"
            >
              <LuArrowLeft size={14} /> Back to subject details
            </Button>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Exam components</p>
                  <p className="text-xs text-muted-foreground">
                    Each component is an MCQ or Written paper. Question bank and exams map to these.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() =>
                    setComponents((prev) => [
                      ...prev,
                      { name: `Paper ${prev.length + 1}`, type: 'mcq' },
                    ])
                  }
                >
                  <LuPlus size={14} /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {components.map((comp, idx) => (
                  <div key={comp._id || idx} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-xs text-muted-foreground text-right">
                      {idx + 1}.
                    </span>
                    <Input
                      value={comp.name}
                      onChange={(e) => {
                        const next = [...components];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setComponents(next);
                      }}
                      placeholder="e.g. Paper 1"
                      disabled={loading}
                      className="flex-1"
                    />
                    <select
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      value={comp.type}
                      disabled={loading}
                      onChange={(e) => {
                        const next = [...components];
                        next[idx] = {
                          ...next[idx],
                          type: e.target.value as 'mcq' | 'written',
                        };
                        setComponents(next);
                      }}
                    >
                      <option value="mcq">MCQ</option>
                      <option value="written">Written</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={loading || components.length <= 1}
                      onClick={() =>
                        setComponents((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label="Remove component"
                    >
                      <LuTrash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Chapters</p>
                  <p className="text-xs text-muted-foreground">
                    Add all chapter names for this subject. Courses inherit these; instructors cannot add chapters.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => setChapters((prev) => [...prev, ''])}
                >
                  <LuPlus size={14} /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {chapters.map((ch, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-xs text-muted-foreground text-right">
                      {idx + 1}.
                    </span>
                    <Input
                      value={ch}
                      onChange={(e) => {
                        const next = [...chapters];
                        next[idx] = e.target.value;
                        setChapters(next);
                      }}
                      placeholder={`Chapter ${idx + 1} name`}
                      disabled={loading}
                      autoFocus={idx === 0}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={loading || chapters.length <= 1}
                      onClick={() =>
                        setChapters((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label="Remove chapter"
                    >
                      <LuTrash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Or paste chapters (one per line)
                </label>
                <textarea
                  className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={pasteBlock}
                  onChange={(e) => setPasteBlock(e.target.value)}
                  placeholder={'Number\nAlgebra\nGeometry'}
                  disabled={loading}
                  onBlur={() => {
                    if (!pasteBlock.trim()) return;
                    const parsed = parseChapterLines(pasteBlock);
                    if (parsed.length) {
                      setChapters(parsed.map((c) => c.name));
                      setPasteBlock('');
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Platform QB access price (৳)
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                value={qbAccessPrice}
                onChange={(e) => setQbAccessPrice(e.target.value)}
                placeholder="e.g. 500"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Charged when instructors borrow this subject. Leave empty to use the platform default fee.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="subject-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(Boolean(v))}
                disabled={loading}
              />
              <label htmlFor="subject-active" className="text-sm">
                Active (available for courses and question bank)
              </label>
            </div>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </FormModal>
  );
}
