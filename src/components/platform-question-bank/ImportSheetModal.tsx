'use client';

import { useRef, useState } from 'react';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import SubjectGradeSelect, {
  type SubjectGradeValue,
} from '@/components/platform-question-bank/SubjectGradeSelect';
import SubjectAccessPriceField from '@/components/platform-question-bank/SubjectAccessPriceField';
import { platformQuestionsService } from '@/services/platformQuestionsService';
import { MASTER_SHEET_HEADERS } from '@/lib/pastPaperSheetHeaders';
import {
  LuUpload,
  LuDownload,
  LuFileSpreadsheet,
  LuLink,
  LuCheck,
} from 'react-icons/lu';

type SourceMode = 'file' | 'sheet';

type ImportStats = {
  rawRows: number;
  ready: number;
  skippedNoText: number;
  skippedNoQid: number;
  incomplete: number;
  inserted?: number;
  updated?: number;
};

type SampleRow = {
  qid?: string;
  subject: string;
  topic: string;
  year?: number;
  session?: string;
  paper?: string;
  questionNumber?: string;
  questionText: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportSheetModal({ open, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SourceMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [subjectGrade, setSubjectGrade] = useState<SubjectGradeValue>({
    subjectId: '',
    subjectCode: '',
    subjectName: '',
    grade: '',
  });
  const [qbAccessPrice, setQbAccessPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [sample, setSample] = useState<SampleRow[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [done, setDone] = useState(false);

  const reset = () => {
    setMode('file');
    setFile(null);
    setSheetUrl('');
    setSubjectGrade({ subjectId: '', subjectCode: '', subjectName: '', grade: '' });
    setLoading(false);
    setError('');
    setStats(null);
    setSample([]);
    setSheetName('');
    setDone(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const buildForm = (preview: boolean) => {
    const form = new FormData();
    if (preview) form.append('preview', '1');
    if (subjectGrade.subjectId) form.append('subjectId', subjectGrade.subjectId);
    if (subjectGrade.subjectCode) form.append('subjectCode', subjectGrade.subjectCode);
    if (subjectGrade.subjectName) form.append('subjectName', subjectGrade.subjectName);
    if (subjectGrade.grade) form.append('grade', subjectGrade.grade);
    form.append('accessPolicy', 'private');

    if (mode === 'file') {
      if (!file) throw new Error('Choose an .xlsx or .csv file');
      form.append('file', file);
    } else {
      const url = sheetUrl.trim();
      if (!url) throw new Error('Paste a Google Sheet URL');
      form.append('sheetUrl', url);
    }
    return form;
  };

  const runPreview = async () => {
    setError('');
    setDone(false);
    setStats(null);
    setSample([]);
    setLoading(true);
    try {
      const form = buildForm(true);
      const res = await platformQuestionsService.importSheet(form);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.error || 'Preview failed');
        return;
      }
      setStats(json.data.stats as ImportStats);
      setSample((json.data.sample || []) as SampleRow[]);
      setSheetName(String(json.data.sheetName || ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const runImport = async () => {
    setError('');
    setLoading(true);
    try {
      const form = buildForm(false);
      const res = await platformQuestionsService.importSheet(form);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.error || 'Import failed');
        return;
      }
      setStats(json.data.stats as ImportStats);
      setSample((json.data.sample || []) as SampleRow[]);
      setSheetName(String(json.data.sheetName || ''));
      setDone(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (!selected) {
      setFile(null);
      return;
    }
    const name = selected.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setError('Please upload an .xlsx, .xls, or .csv file');
      setFile(null);
      e.target.value = '';
      return;
    }
    setError('');
    setFile(selected);
    setStats(null);
    setSample([]);
    setDone(false);
  };

  const canPreview =
    !loading && (mode === 'file' ? Boolean(file) : Boolean(sheetUrl.trim()));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import from sheet"
      description="Upload XLSX, CSV, or a Google Sheet using the master Question Database columns"
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a
            href="/api/platform-questions/import"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary"
          >
            <LuDownload className="h-4 w-4" />
            Download CSV template
          </a>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              {done ? 'Close' : 'Cancel'}
            </Button>
            {!done && (
              <>
                <Button variant="outline" disabled={!canPreview} onClick={() => void runPreview()}>
                  {loading ? 'Working…' : 'Preview'}
                </Button>
                <Button
                  disabled={!canPreview}
                  onClick={() => void runImport()}
                  className="bg-gradient-to-r from-primary via-primary/95 to-primary/75 text-white hover:from-primary/95 hover:via-primary hover:to-primary/85"
                >
                  <LuUpload className="mr-1.5 h-4 w-4" />
                  {loading ? 'Importing…' : 'Import'}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              mode === 'file'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LuFileSpreadsheet className="h-4 w-4" />
            XLSX / CSV
          </button>
          <button
            type="button"
            onClick={() => setMode('sheet')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              mode === 'sheet'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LuLink className="h-4 w-4" />
            Google Sheet
          </button>
        </div>

        {mode === 'file' ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Spreadsheet file
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={onFileChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
            {file && (
              <p className="mt-1.5 text-xs text-slate-500">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>
        ) : (
          <div>
            <AttractiveInput
              label="Google Sheet URL"
              value={sheetUrl}
              onChange={(e) => {
                setSheetUrl(e.target.value);
                setStats(null);
                setDone(false);
              }}
              placeholder="https://docs.google.com/spreadsheets/d/…"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Share the sheet as “Anyone with the link can view” so the server can export it.
            </p>
          </div>
        )}

        <SubjectGradeSelect value={subjectGrade} onChange={setSubjectGrade} />
        <SubjectAccessPriceField
          subjectId={subjectGrade.subjectId || undefined}
          value={qbAccessPrice}
          onChange={setQbAccessPrice}
          disabled={loading}
        />
        <p className="text-xs text-slate-500">
          Optional subject override — if empty, each row keeps its own Subject column from the sheet.
        </p>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Required columns
          </p>
          <p className="mt-1 break-words font-mono text-[11px] leading-relaxed text-slate-600">
            {MASTER_SHEET_HEADERS.join(' · ')}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {done && stats && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <LuCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Imported {stats.ready} question{stats.ready === 1 ? '' : 's'}
              {typeof stats.inserted === 'number' && (
                <>
                  {' '}
                  ({stats.inserted} new, {stats.updated ?? 0} updated)
                </>
              )}
              {sheetName ? ` from “${sheetName}”` : ''}.
            </span>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Rows', stats.rawRows],
              ['Ready', stats.ready],
              ['No text', stats.skippedNoText],
              ['No QID', stats.skippedNoQid],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center"
              >
                <div className="text-lg font-bold text-slate-900">{value}</div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {sample.length > 0 && (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {sample.map((row) => (
              <div key={row.qid || row.questionText} className="rounded-md bg-slate-50 px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-slate-700">
                  <span className="font-mono text-primary">{row.qid || '—'}</span>
                  <span className="text-slate-400">·</span>
                  <span>
                    {[row.session, row.year, row.paper, row.questionNumber]
                      .filter(Boolean)
                      .join(' ')}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>{row.topic}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{row.questionText}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
