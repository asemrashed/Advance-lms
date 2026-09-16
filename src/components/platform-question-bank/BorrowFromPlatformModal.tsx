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
import { BATCH_GRADES } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';
import { LuChevronLeft, LuChevronRight, LuEye, LuShoppingCart, LuSend } from 'react-icons/lu';
import { MathText } from '@/components/ui/MathText';

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
  sharedPreviewCount: number;
};

type CatalogQuestion = {
  _id: string;
  subject: string;
  topic: string;
  difficulty?: number;
  questionFormat?: string;
  questionText: string;
  options: { text: string }[];
  accessPolicy?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function BorrowFromPlatformModal({ open, onClose, onSubmitted }: Props) {
  const [grade, setGrade] = useState('all');
  const [search, setSearch] = useState('');
  const [subjectPage, setSubjectPage] = useState(1);
  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [subjectPagination, setSubjectPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    pages: 0,
  });
  const [fullPlatformFee, setFullPlatformFee] = useState(500);
  const [paidEnabled, setPaidEnabled] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState<CatalogSubject | null>(null);
  const [topicPage, setTopicPage] = useState(1);
  const [topics, setTopics] = useState<CatalogTopic[]>([]);
  const [topicPagination, setTopicPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    pages: 0,
  });
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  const [previewTopic, setPreviewTopic] = useState<string | null>(null);
  const [questionPage, setQuestionPage] = useState(1);
  const [questions, setQuestions] = useState<CatalogQuestion[]>([]);
  const [questionPagination, setQuestionPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const scopeType = useMemo(() => {
    if (!selectedSubject) return 'full' as const;
    if (selectedTopics.size > 0) return 'topics' as const;
    return 'subject' as const;
  }, [selectedSubject, selectedTopics]);

  const accessPrice = selectedSubject?.accessPrice ?? fullPlatformFee;

  const loadSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const params = new URLSearchParams({
        view: 'subjects',
        page: String(subjectPage),
        limit: '15',
      });
      if (grade !== 'all') params.set('grade', grade);
      if (search.trim()) params.set('search', search.trim());
      const res = await platformQuestionsService.borrowCatalog(params.toString());
      if (!res.ok) {
        setSubjects([]);
        return;
      }
      const json = await res.json();
      setSubjects(json.data?.subjects || []);
      setSubjectPagination(json.data?.pagination || { page: 1, limit: 15, total: 0, pages: 0 });
      if (json.data?.fullPlatformFee != null) setFullPlatformFee(Number(json.data.fullPlatformFee));
      if (typeof json.data?.paidAccessEnabled === 'boolean') {
        setPaidEnabled(json.data.paidAccessEnabled);
      }
    } finally {
      setLoadingSubjects(false);
    }
  }, [subjectPage, grade, search]);

  const loadTopics = useCallback(async () => {
    if (!selectedSubject) {
      setTopics([]);
      return;
    }
    setLoadingTopics(true);
    try {
      const params = new URLSearchParams({
        view: 'topics',
        page: String(topicPage),
        limit: '15',
        subjectId: selectedSubject._id,
      });
      if (selectedSubject.grade) params.set('grade', selectedSubject.grade);
      const res = await platformQuestionsService.borrowCatalog(params.toString());
      if (!res.ok) {
        setTopics([]);
        return;
      }
      const json = await res.json();
      setTopics(json.data?.topics || []);
      setTopicPagination(json.data?.pagination || { page: 1, limit: 15, total: 0, pages: 0 });
    } finally {
      setLoadingTopics(false);
    }
  }, [selectedSubject, topicPage]);

  const loadQuestions = useCallback(async () => {
    if (!selectedSubject || !previewTopic) {
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    try {
      const params = new URLSearchParams({
        view: 'questions',
        page: String(questionPage),
        limit: '20',
        subjectId: selectedSubject._id,
        topic: previewTopic,
      });
      const res = await platformQuestionsService.borrowCatalog(params.toString());
      if (!res.ok) {
        setQuestions([]);
        return;
      }
      const json = await res.json();
      setQuestions(json.data?.questions || []);
      setQuestionPagination(json.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } finally {
      setLoadingQuestions(false);
    }
  }, [selectedSubject, previewTopic, questionPage]);

  useEffect(() => {
    if (!open) return;
    void loadSubjects();
  }, [open, loadSubjects]);

  useEffect(() => {
    if (!open || !selectedSubject) return;
    void loadTopics();
  }, [open, selectedSubject, loadTopics]);

  useEffect(() => {
    if (!open || !previewTopic) return;
    void loadQuestions();
  }, [open, previewTopic, loadQuestions]);

  useEffect(() => {
    if (!open) {
      setSelectedSubject(null);
      setSelectedTopics(new Set());
      setPreviewTopic(null);
      setNote('');
      setError('');
      setSubjectPage(1);
      setTopicPage(1);
      setQuestionPage(1);
    }
  }, [open]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  const selectAllTopics = async () => {
    if (!selectedSubject) return;
    const params = new URLSearchParams({
      view: 'topics',
      page: '1',
      limit: '500',
      subjectId: selectedSubject._id,
    });
    if (selectedSubject.grade) params.set('grade', selectedSubject.grade);
    const res = await platformQuestionsService.borrowCatalog(params.toString());
    if (!res.ok) {
      setSelectedTopics(new Set(topics.map((t) => t.topic)));
      return;
    }
    const json = await res.json();
    const all: CatalogTopic[] = json.data?.topics || [];
    setSelectedTopics(new Set(all.map((t) => t.topic)));
  };

  const scopePayload = () => {
    if (!selectedSubject) {
      return { scopeType: 'full' as const };
    }
    return {
      scopeType,
      subjectId: selectedSubject._id,
      subjectCode: selectedSubject.subjectCode,
      subjectName: selectedSubject.title,
      grade: selectedSubject.grade,
      topics: scopeType === 'topics' ? Array.from(selectedTopics) : undefined,
    };
  };

  const requestFree = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await platformQuestionsService.requestAccess({
        ...scopePayload(),
        note: note.trim() || undefined,
        isPaid: false,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Could not submit request');
        return;
      }
      onSubmitted?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const buyAccess = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await platformQuestionsService.payForAdminQbAccess({
        ...scopePayload(),
        note: note.trim() || undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Could not start payment');
        return;
      }
      const url = json.data?.checkout_url;
      if (url) {
        window.location.href = url;
        return;
      }
      setError('Payment gateway did not return a checkout URL');
    } finally {
      setBusy(false);
    }
  };

  const scopeLabel = !selectedSubject
    ? 'Full Platform QB'
    : selectedTopics.size > 0
      ? `${selectedSubject.title} · ${selectedTopics.size} topic(s)`
      : `${selectedSubject.title} (entire subject)`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Borrow from the Platform</DialogTitle>
          <DialogDescription>
            Browse subjects and topics. Preview only shared questions. Buy or request subject
            access — you use the shared originals until you edit (then a private copy is created).
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[140px]">
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
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  {BATCH_GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {formatGradeLabel(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Search subject / code
              </label>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSubjectPage(1);
                }}
                placeholder="e.g. Mathematics or 4024"
              />
            </div>
          </div>

          {/* Subject list */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Subjects</h3>
              <Button
                size="sm"
                variant={selectedSubject ? 'outline' : 'secondary'}
                onClick={() => {
                  setSelectedSubject(null);
                  setSelectedTopics(new Set());
                  setPreviewTopic(null);
                }}
              >
                Full platform (৳{fullPlatformFee})
              </Button>
            </div>
            {loadingSubjects ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading subjects…</p>
            ) : subjects.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No subjects found.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Topics</th>
                      <th className="px-3 py-2 font-medium">Questions</th>
                      <th className="px-3 py-2 font-medium">Access price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => {
                      const active = selectedSubject?._id === s._id;
                      return (
                        <tr
                          key={s._id}
                          onClick={() => {
                            setSelectedSubject(s);
                            setSelectedTopics(new Set());
                            setPreviewTopic(null);
                            setTopicPage(1);
                          }}
                          className={`cursor-pointer border-t transition-colors ${
                            active ? 'bg-primary/10' : 'hover:bg-muted/40'
                          }`}
                        >
                          <td className="px-3 py-2 font-medium">
                            {s.title}
                            {s.grade ? (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                {s.grade}
                              </Badge>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{s.subjectCode}</td>
                          <td className="px-3 py-2">{s.totalTopics}</td>
                          <td className="px-3 py-2">{s.totalQuestions}</td>
                          <td className="px-3 py-2">৳{s.accessPrice}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {subjectPagination.pages > 1 && (
              <Pager
                page={subjectPagination.page}
                pages={subjectPagination.pages}
                onPrev={() => setSubjectPage((p) => Math.max(1, p - 1))}
                onNext={() => setSubjectPage((p) => p + 1)}
              />
            )}
          </div>

          {/* Topics */}
          {selectedSubject && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Topics in {selectedSubject.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Optional filter — price is always per subject
                  </span>
                </h3>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={!topics.length && topicPagination.total === 0}
                    onClick={() => void selectAllTopics()}
                  >
                    Select all topics
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    disabled={selectedTopics.size === 0}
                    onClick={() => setSelectedTopics(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              {loadingTopics ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading topics…</p>
              ) : topics.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No topics yet.</p>
              ) : (
                <div className="space-y-1 rounded-lg border p-2">
                  {topics.map((t) => {
                    const checked = selectedTopics.has(t.topic);
                    return (
                      <div
                        key={t.topic}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTopic(t.topic)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="min-w-0 flex-1 text-sm">{t.topic}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.totalQuestions} q · {t.sharedPreviewCount} shared
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            setPreviewTopic(t.topic);
                            setQuestionPage(1);
                          }}
                        >
                          <LuEye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              {topicPagination.pages > 1 && (
                <Pager
                  page={topicPagination.page}
                  pages={topicPagination.pages}
                  onPrev={() => setTopicPage((p) => Math.max(1, p - 1))}
                  onNext={() => setTopicPage((p) => p + 1)}
                />
              )}
            </div>
          )}

          {/* Shared question preview */}
          {previewTopic && selectedSubject && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Shared preview · {previewTopic}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Only questions marked shared/public by admin
                </span>
              </h3>
              {loadingQuestions ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
              ) : questions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No shared questions to preview for this topic.
                </p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q) => (
                    <div key={q._id} className="rounded-lg border p-3 text-sm">
                      <p className="line-clamp-3">
                        <MathText text={q.questionText} />
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {(q.questionFormat || 'mcq').toUpperCase()}
                        </Badge>
                        {q.difficulty != null && (
                          <Badge variant="outline" className="text-[10px]">
                            L{q.difficulty}
                          </Badge>
                        )}
                      </div>
                      {q.options?.length > 0 && (
                        <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                          {q.options.slice(0, 4).map((o, i) => (
                            <li key={i} className="truncate">
                              {o.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {questionPagination.pages > 1 && (
                <Pager
                  page={questionPagination.page}
                  pages={questionPagination.pages}
                  onPrev={() => setQuestionPage((p) => Math.max(1, p - 1))}
                  onNext={() => setQuestionPage((p) => p + 1)}
                />
              )}
            </div>
          )}

          {/* Request / buy */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Request access</p>
                <p className="text-xs text-muted-foreground">
                  Scope: {scopeLabel}
                  {paidEnabled ? ` · ৳${accessPrice}` : ''}
                </p>
              </div>
              {paidEnabled && (
                <p className="text-[11px] text-muted-foreground">
                  Payment via SSLCommerz (secure checkout)
                </p>
              )}
            </div>
            <AttractiveTextarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for admin…"
              rows={2}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              {paidEnabled && (
                <Button disabled={busy} onClick={buyAccess}>
                  <LuShoppingCart className="mr-1.5 h-4 w-4" />
                  Buy access · ৳{accessPrice}
                </Button>
              )}
              <Button variant="outline" disabled={busy} onClick={requestFree}>
                <LuSend className="mr-1.5 h-4 w-4" />
                Request free access
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Pager({
  page,
  pages,
  onPrev,
  onNext,
}: {
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2" disabled={page <= 1} onClick={onPrev}>
          <LuChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2"
          disabled={page >= pages}
          onClick={onNext}
        >
          <LuChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
