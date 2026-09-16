"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { questionsStaffService } from "@/services/questionsStaffService";
import { resourceScopeService } from "@/services/resourceScopeService";
import type { Question } from "@/types/exam";
import { LuLibrary, LuPlus, LuSearch, LuX } from "react-icons/lu";
import { MathText } from "@/components/ui/MathText";

type WorksheetQuestionPickerProps = {
  role: "admin" | "instructor";
  courseId?: string;
  chapterId?: string;
  /** Kept for callers; worksheets filter by chapter/topic, not lesson. */
  lessonId?: string;
  subject?: string;
  topic?: string;
  /** Display labels shown above the bank list (curriculum scope). */
  subjectLabel?: string;
  chapterLabel?: string;
  batchScope?: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

type BankQuestion = Question & {
  course?: { _id: string; title: string };
  chapter?: { _id: string; title: string };
  lessonInfo?: { _id: string; title: string };
};

function toBankQuestion(row: Record<string, unknown>): BankQuestion {
  const rawId = String(row._id ?? "");
  const platformId =
    typeof row.platformQuestionId === "string"
      ? row.platformQuestionId
      : rawId.startsWith("platform:")
        ? rawId.slice("platform:".length)
        : "";
  return {
    _id: rawId,
    question: String(row.questionText || row.question || "").trim() || "Untitled question",
    type: String(row.questionFormat || row.type || "written"),
    marks: Number(row.marks || 1),
    ...(platformId ? { platformQuestionId: platformId } : {}),
  } as BankQuestion;
}

function normalizeSubjectName(raw: string): string {
  return raw.replace(/\s+\d{3,5}\s*$/, "").trim();
}

export function WorksheetQuestionPicker({
  role,
  courseId,
  chapterId,
  subject,
  topic,
  subjectLabel,
  chapterLabel,
  batchScope = false,
  selectedIds,
  onChange,
  disabled = false,
}: WorksheetQuestionPickerProps) {
  const router = useRouter();
  const [sourceCourseId, setSourceCourseId] = useState("");
  const [sourceChapterId, setSourceChapterId] = useState("");
  const [courses, setCourses] = useState<{ _id: string; label: string }[]>([]);
  const [chapters, setChapters] = useState<{ _id: string; label: string }[]>([]);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<Record<string, BankQuestion>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filterCourseId = batchScope ? sourceCourseId : courseId;
  const filterChapterId = batchScope ? sourceChapterId : chapterId;

  const ownQuestionBankHref =
    role === "admin" ? "/admin/question-bank" : "/instructor/question-bank";
  const scopeSubject = subjectLabel || subject || "";
  const scopeChapter = chapterLabel || topic || "";
  const bankSubjectName = normalizeSubjectName(scopeSubject);

  // Admin subject-scoped worksheets browse the platform bank.
  const usePlatformBank = role === "admin" && Boolean(subject || subjectLabel);

  useEffect(() => {
    if (!batchScope) return;
    let cancelled = false;
    (async () => {
      const rows = await resourceScopeService.listCourses("live");
      if (!cancelled) setCourses(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [batchScope]);

  useEffect(() => {
    if (!batchScope || !sourceCourseId) {
      setChapters([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const rows = await resourceScopeService.listChapters(sourceCourseId);
      if (!cancelled) setChapters(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [batchScope, sourceCourseId]);

  const fetchQuestions = useCallback(async () => {
    if (usePlatformBank) {
      if (!bankSubjectName) {
        setQuestions([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "50",
          subject: bankSubjectName,
        });
        // Optional topic filter — only when explicitly chosen (admin chapter field).
        if (topic) params.set("topic", topic);
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`/api/platform-questions?${params.toString()}`);
        const json = await res.json();
        const rows = Array.isArray(json?.data?.questions) ? json.data.questions : [];
        setQuestions(rows.map((row: Record<string, unknown>) => toBankQuestion(row)));
      } catch {
        setQuestions([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (role === "admin" && !courseId && !bankSubjectName) {
      setQuestions([]);
      return;
    }

    if (!filterCourseId && batchScope && !bankSubjectName) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "50",
        status: "active",
      });

      // Match Course Question Bank: prefer subjectName so borrowed/forked
      // questions tagged "GCSE Mathematics" appear even when curriculum chapter
      // ObjectId has no linked lessons.
      if (bankSubjectName) {
        params.set("subjectName", bankSubjectName);
      } else if (filterCourseId) {
        params.set("course", filterCourseId);
        if (filterChapterId) params.set("chapter", filterChapterId);
      }

      if (search.trim()) params.set("search", search.trim());

      const res = await questionsStaffService.listQuestionBank(role, params.toString());
      const json = (await res.json()) as {
        data?: { questions?: BankQuestion[] };
      };
      const rows = json.data?.questions ?? [];
      setQuestions(
        rows.map((row) => toBankQuestion(row as unknown as Record<string, unknown>)),
      );
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [
    usePlatformBank,
    bankSubjectName,
    role,
    topic,
    courseId,
    filterCourseId,
    filterChapterId,
    batchScope,
    search,
  ]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    setSelectedMeta((prev) => {
      const next = { ...prev };
      for (const q of questions) {
        if (selectedIds.includes(q._id)) next[q._id] = q;
        const bare = q._id.startsWith("platform:")
          ? q._id.slice("platform:".length)
          : "";
        if (bare && selectedIds.includes(bare)) next[bare] = { ...q, _id: bare };
      }
      for (const id of Object.keys(next)) {
        if (!selectedIds.includes(id)) delete next[id];
      }
      return next;
    });
  }, [questions, selectedIds]);

  // Hydrate selected questions missing from the current bank page (edit form).
  useEffect(() => {
    const missing = selectedIds.filter((id) => !selectedMeta[id]);
    if (!missing.length) return;

    let cancelled = false;
    const missingKey = missing
      .map((id) => id.replace(/^platform:/, ""))
      .filter(Boolean)
      .sort()
      .join(",");

    (async () => {
      try {
        const nextMeta: Record<string, BankQuestion> = {};

        // Course / instructor bank by id
        {
          const params = new URLSearchParams({
            limit: String(Math.min(Math.max(missing.length, 50), 200)),
            ids: missingKey,
          });
          const res = await questionsStaffService.listQuestionBank(role, params.toString());
          const json = (await res.json()) as {
            data?: { questions?: BankQuestion[] };
          };
          for (const row of json.data?.questions ?? []) {
            const q = toBankQuestion(row as unknown as Record<string, unknown>);
            const bare = q._id.replace(/^platform:/, "");
            if (missing.includes(q._id)) nextMeta[q._id] = q;
            if (bare && missing.includes(bare)) nextMeta[bare] = { ...q, _id: bare };
          }
        }

        // Platform questions by id (admin worksheets + shared platform ids)
        const stillMissing = missing.filter((id) => !nextMeta[id]);
        if (stillMissing.length) {
          const params = new URLSearchParams({
            limit: String(Math.min(Math.max(stillMissing.length, 50), 200)),
            ids: stillMissing.map((id) => id.replace(/^platform:/, "")).join(","),
          });
          const res = await fetch(`/api/platform-questions?${params.toString()}`);
          const json = await res.json();
          const rows = Array.isArray(json?.data?.questions) ? json.data.questions : [];
          for (const row of rows) {
            const q = toBankQuestion(row as Record<string, unknown>);
            if (stillMissing.includes(q._id)) nextMeta[q._id] = q;
            const prefixed = `platform:${q._id}`;
            if (stillMissing.includes(prefixed)) nextMeta[prefixed] = { ...q, _id: prefixed };
          }
        }

        if (cancelled) return;
        setSelectedMeta((prev) => {
          const next = { ...prev, ...nextMeta };
          for (const id of missing) {
            if (!next[id]) {
              next[id] = {
                _id: id,
                question: "Selected question",
                type: "written",
                marks: 1,
              } as BankQuestion;
            }
          }
          return next;
        });
      } catch {
        if (cancelled) return;
        setSelectedMeta((prev) => {
          const next = { ...prev };
          for (const id of missing) {
            if (!next[id]) {
              next[id] = {
                _id: id,
                question: "Selected question",
                type: "written",
                marks: 1,
              } as BankQuestion;
            }
          }
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on selection only
  }, [selectedIds, role]);

  const selectedQuestions = useMemo(() => {
    return selectedIds.map((id) => {
      return (
        selectedMeta[id] ||
        questions.find((q) => q._id === id || q._id === `platform:${id}`) ||
        ({
          _id: id,
          question: "Selected question",
          type: "written",
          marks: 1,
        } as BankQuestion)
      );
    });
  }, [selectedIds, selectedMeta, questions]);

  const addQuestion = (q: BankQuestion) => {
    if (disabled) return;
    // Persist bare ObjectId for platform rows so worksheet APIs accept them.
    const storeId = q._id.startsWith("platform:")
      ? q._id.slice("platform:".length)
      : q._id;
    if (selectedIds.includes(storeId) || selectedIds.includes(q._id)) return;
    setSelectedMeta((prev) => ({ ...prev, [storeId]: { ...q, _id: storeId } }));
    onChange([...selectedIds, storeId]);
  };

  const removeQuestion = (id: string) => {
    if (disabled) return;
    onChange(selectedIds.filter((x) => x !== id));
  };

  const isSelected = (q: BankQuestion) => {
    const bare = q._id.startsWith("platform:")
      ? q._id.slice("platform:".length)
      : q._id;
    return selectedIds.includes(q._id) || selectedIds.includes(bare);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          {usePlatformBank ? "Platform question bank" : "Course question bank"}
        </p>
        {scopeSubject || scopeChapter ? (
          <p className="mt-1 text-xs font-medium text-foreground/80">
            {[scopeSubject, scopeChapter].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Add questions from the bank on the left. Selected questions appear on the right.
        </p>
      </div>

      {batchScope ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Source course</p>
            <Select
              value={sourceCourseId}
              onValueChange={(id) => {
                setSourceCourseId(id);
                setSourceChapterId("");
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Chapter (optional)</p>
            <Select
              value={sourceChapterId || "__all__"}
              onValueChange={(id) => setSourceChapterId(id === "__all__" ? "" : id)}
              disabled={disabled || !sourceCourseId}
            >
              <SelectTrigger>
                <SelectValue placeholder="All chapters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All chapters</SelectItem>
                {chapters.map((ch) => (
                  <SelectItem key={ch._id} value={ch._id}>
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Question bank</p>
            <span className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${questions.length} shown`}
            </span>
          </div>
          <div className="relative mb-3">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="scrollbar-slim max-h-[min(420px,45vh)] space-y-2 overflow-y-auto pr-1">
            {questions.length === 0 && !loading ? (
              batchScope && !sourceCourseId && !bankSubjectName ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Choose a source course to load questions.
                </p>
              ) : (
                <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {bankSubjectName
                      ? `No questions found for “${bankSubjectName}” in your question bank yet.`
                      : "No questions in your question bank for the selected chapter / topic yet."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={disabled}
                    onClick={() => router.push(ownQuestionBankHref)}
                  >
                    <LuLibrary className="h-4 w-4" />
                    Open my question bank
                  </Button>
                </div>
              )
            ) : (
              questions.map((q) => {
                const already = isSelected(q);
                return (
                  <div key={q._id} className="rounded-xl border border-border p-3">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">
                      <MathText text={q.question} />
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {String(q.type || "written").replace("_", " ")} · {q.marks} mark
                        {q.marks === 1 ? "" : "s"}
                        {q.lessonInfo?.title ? ` · ${q.lessonInfo.title}` : ""}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={already ? "secondary" : "outline"}
                        disabled={disabled || already}
                        onClick={() => addQuestion(q)}
                      >
                        <LuPlus className="mr-1 h-3.5 w-3.5" />
                        {already ? "Added" : "Add"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Selected questions</p>
            <span className="text-xs font-semibold text-muted-foreground">
              {selectedQuestions.length} Q
            </span>
          </div>
          <div className="scrollbar-slim max-h-[min(420px,45vh)] space-y-2 overflow-y-auto pr-1">
            {selectedQuestions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Add questions from the bank
              </p>
            ) : (
              selectedQuestions.map((q, index) => (
                <div key={q._id} className="rounded-xl border border-border p-3">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {index + 1}. <MathText text={q.question} />
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {String(q.type || "written").replace("_", " ")} · {q.marks} mark
                      {q.marks === 1 ? "" : "s"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeQuestion(q._id)}
                    >
                      <LuX className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
