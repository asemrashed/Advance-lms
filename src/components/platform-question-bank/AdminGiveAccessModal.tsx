'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import { platformQuestionsService } from '@/services/platformQuestionsService';
import { apiFetch } from '@/lib/api/httpClient';
import { BATCH_GRADES } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';
import { LuChevronLeft, LuChevronRight, LuKey } from 'react-icons/lu';

type InstructorOption = {
  _id: string;
  name?: string;
  email?: string;
};

type CatalogSubject = {
  _id: string;
  title: string;
  subjectCode: string;
  grade?: string;
  totalTopics: number;
  totalQuestions: number;
  accessPrice: number;
};

type CatalogTopic = {
  topic: string;
  totalQuestions: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onGranted?: () => void;
}

function instructorLabel(u: InstructorOption) {
  const name =
    u.name || 'Instructor';
  return u.email ? `${name} (${u.email})` : name;
}

export default function AdminGiveAccessModal({ open, onClose, onGranted }: Props) {
  const [instructorSearch, setInstructorSearch] = useState('');
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [instructorId, setInstructorId] = useState('');

  const [grade, setGrade] = useState('all');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [subjectPage, setSubjectPage] = useState(1);
  const [subjectPages, setSubjectPages] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<CatalogSubject | null>(null);

  const [topics, setTopics] = useState<CatalogTopic[]>([]);
  const [topicPage, setTopicPage] = useState(1);
  const [topicPages, setTopicPages] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  const [expiresInDays, setExpiresInDays] = useState('90');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  const scopeType = useMemo(() => {
    if (!selectedSubject) return 'full' as const;
    if (selectedTopics.size > 0) return 'topics' as const;
    return 'subject' as const;
  }, [selectedSubject, selectedTopics]);

  const loadInstructors = useCallback(async (q: string) => {
    setLoadingInstructors(true);
    try {
      const params = new URLSearchParams({
        role: 'instructor',
        limit: '30',
      });
      if (q.trim()) params.set('search', q.trim());
      const res = await apiFetch(`/api/users?${params}`);
      if (!res.ok) {
        setInstructors([]);
        return;
      }
      const json = await res.json();
      setInstructors(json.users || []);
    } finally {
      setLoadingInstructors(false);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    const params = new URLSearchParams({
      view: 'subjects',
      page: String(subjectPage),
      limit: '15',
    });
    if (grade !== 'all') params.set('grade', grade);
    if (subjectSearch.trim()) params.set('search', subjectSearch.trim());
    const res = await platformQuestionsService.borrowCatalog(params.toString());
    if (!res.ok) return;
    const json = await res.json();
    setSubjects(json.data?.subjects || []);
    setSubjectPages(json.data?.pagination?.pages || 0);
  }, [subjectPage, grade, subjectSearch]);

  const loadTopics = useCallback(async () => {
    if (!selectedSubject) {
      setTopics([]);
      return;
    }
    const params = new URLSearchParams({
      view: 'topics',
      page: String(topicPage),
      limit: '15',
      subjectId: selectedSubject._id,
    });
    const res = await platformQuestionsService.borrowCatalog(params.toString());
    if (!res.ok) return;
    const json = await res.json();
    setTopics(json.data?.topics || []);
    setTopicPages(json.data?.pagination?.pages || 0);
  }, [selectedSubject, topicPage]);

  useEffect(() => {
    if (!open) return;
    void loadInstructors(instructorSearch);
  }, [open, instructorSearch, loadInstructors]);

  useEffect(() => {
    if (!open) return;
    void loadSubjects();
  }, [open, loadSubjects]);

  useEffect(() => {
    if (!open || !selectedSubject) return;
    void loadTopics();
  }, [open, selectedSubject, loadTopics]);

  useEffect(() => {
    if (!open) {
      setInstructorId('');
      setInstructorSearch('');
      setSelectedSubject(null);
      setSelectedTopics(new Set());
      setNote('');
      setError('');
      setGrade('all');
      setSubjectSearch('');
      setExpiresInDays('90');
    }
  }, [open]);

  const submit = async () => {
    setError('');
    if (!instructorId) {
      setError('Select an instructor');
      return;
    }
    setBusy(true);
    try {
      const days = Number.parseInt(expiresInDays || '90', 10);
      const res = await platformQuestionsService.adminGrantAccess({
        instructorId,
        scopeType,
        subjectId: selectedSubject?._id,
        subjectCode: selectedSubject?.subjectCode,
        subjectName: selectedSubject?.title,
        grade: selectedSubject?.grade || (grade !== 'all' ? grade : undefined),
        topics: scopeType === 'topics' ? Array.from(selectedTopics) : undefined,
        note: note.trim() || undefined,
        expiresInDays: Number.isFinite(days) && days > 0 ? days : 90,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Could not grant access');
        return;
      }
      onGranted?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <LuKey className="h-4 w-4" />
            Give Access
          </DialogTitle>
          <DialogDescription>
            Grant an instructor full Platform QB, a subject, or specific topics. Questions are copied
            into their bank on grant so they can edit without changing the original.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Instructor
            </label>
            <Input
              value={instructorSearch}
              onChange={(e) => setInstructorSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="mb-2"
            />
            <Select value={instructorId || undefined} onValueChange={setInstructorId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingInstructors ? 'Loading…' : 'Select instructor'}
                />
              </SelectTrigger>
              <SelectContent>
                {instructors.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {instructorLabel(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="w-[120px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Grade</label>
              <Select
                value={grade}
                onValueChange={(v) => {
                  setGrade(v);
                  setSubjectPage(1);
                  setSelectedSubject(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {BATCH_GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {formatGradeLabel(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Subject / code search
              </label>
              <Input
                value={subjectSearch}
                onChange={(e) => {
                  setSubjectSearch(e.target.value);
                  setSubjectPage(1);
                }}
                placeholder="Sequential or standalone filter"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Scope</h3>
              <Button
                size="sm"
                variant={!selectedSubject ? 'secondary' : 'outline'}
                onClick={() => {
                  setSelectedSubject(null);
                  setSelectedTopics(new Set());
                }}
              >
                Full Platform QB
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Q</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr
                      key={s._id}
                      onClick={() => {
                        setSelectedSubject(s);
                        setSelectedTopics(new Set());
                        setTopicPage(1);
                      }}
                      className={`cursor-pointer border-t ${
                        selectedSubject?._id === s._id ? 'bg-primary/10' : 'hover:bg-muted/40'
                      }`}
                    >
                      <td className="px-3 py-2">{s.title}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.subjectCode}</td>
                      <td className="px-3 py-2">{s.totalQuestions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subjectPages > 1 && (
              <div className="mt-1 flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={subjectPage <= 1}
                  onClick={() => setSubjectPage((p) => p - 1)}
                >
                  <LuChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={subjectPage >= subjectPages}
                  onClick={() => setSubjectPage((p) => p + 1)}
                >
                  <LuChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {selectedSubject && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Topics (optional — leave empty for whole subject)
              </h3>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                {topics.map((t) => (
                  <label
                    key={t.topic}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTopics.has(t.topic)}
                      onChange={() => {
                        setSelectedTopics((prev) => {
                          const next = new Set(prev);
                          if (next.has(t.topic)) next.delete(t.topic);
                          else next.add(t.topic);
                          return next;
                        });
                      }}
                    />
                    <span className="flex-1">{t.topic}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {t.totalQuestions}
                    </Badge>
                  </label>
                ))}
                {!topics.length && (
                  <p className="py-2 text-center text-xs text-muted-foreground">No topics</p>
                )}
              </div>
              {topicPages > 1 && (
                <div className="mt-1 flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={topicPage <= 1}
                    onClick={() => setTopicPage((p) => p - 1)}
                  >
                    <LuChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={topicPage >= topicPages}
                    onClick={() => setTopicPage((p) => p + 1)}
                  >
                    <LuChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <div className="w-28">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Grant days
              </label>
              <Input
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Note</label>
              <AttractiveTextarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Optional note…"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Scope:{' '}
            {!selectedSubject
              ? 'Full Platform QB'
              : selectedTopics.size
                ? `${selectedSubject.title} · ${selectedTopics.size} topic(s)`
                : `${selectedSubject.title} (subject)`}
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              Grant access
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
