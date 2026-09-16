"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AttractiveInput } from "@/components/ui/attractive-input";
import { AttractiveTextarea } from "@/components/ui/attractive-textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TipTapEditor } from "@/components/ui/TipTapEditor";
import { useSubjects } from "@/hooks/useSubjects";
import { BATCH_GRADES, normalizeBatchGrade } from "@/lib/batchGrades";
import { formatGradeLabel, formatResourceSubjectOptionLabel } from "@/lib/courseLabel";
import { hasQuestionBody } from "@/lib/math/asciiToLatex";
import { componentLabel } from "@/lib/subjectComponents";
import type { SubjectComponent } from "@/types/subject";
import { LuPlus, LuTrash2 } from "react-icons/lu";

const MCQ_OPTIONS = 4;
const DRAFT_PREFIX = "staff-question-composer";

export type ComposerDifficulty = "easy" | "medium" | "hard";
export type ComposerFormat = "mcq" | "written";

export type ComposerScope = {
  grade: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  componentId: string;
  topic: string;
  subtopic: string;
};

export type ComposerItem = {
  key: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  answerText: string;
  marks: number;
  difficulty: ComposerDifficulty;
};

export type ComposerSubmitPayload = {
  scope: ComposerScope;
  format: ComposerFormat;
  items: ComposerItem[];
};

function emptyOptions() {
  return Array.from({ length: MCQ_OPTIONS }, () => ({ text: "", isCorrect: false }));
}

function newItem(): ComposerItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    questionText: "",
    options: emptyOptions(),
    answerText: "",
    marks: 1,
    difficulty: "medium",
  };
}

function emptyScope(): ComposerScope {
  return {
    grade: "",
    subjectId: "",
    subjectName: "",
    subjectCode: "",
    componentId: "",
    topic: "",
    subtopic: "",
  };
}

export function platformDifficulty(d: ComposerDifficulty): 1 | 2 | 3 {
  return d === "easy" ? 1 : d === "hard" ? 3 : 2;
}

export function fromPlatformDifficulty(value?: number): ComposerDifficulty {
  if (value === 1) return "easy";
  if (value === 3) return "hard";
  return "medium";
}

export type StaffQuestionComposerHandle = {
  getPayload: () => ComposerSubmitPayload;
};

interface Props {
  bank: "platform" | "course";
  role: "admin" | "instructor";
  editing?: boolean;
  defaultScope?: Partial<ComposerScope>;
  initialItems?: ComposerItem[];
  /** When true (e.g. creating questions on an exam), inherit scope and hide class/subject/component pickers. */
  lockScope?: boolean;
  /** Fallback question format while locked exam component type is resolving. */
  defaultFormat?: ComposerFormat;
  /** Optional labels for locked scope display. */
  lockedScopeLabels?: {
    grade?: string;
    subject?: string;
    component?: string;
  };
}

export const StaffQuestionComposer = forwardRef<StaffQuestionComposerHandle, Props>(
  function StaffQuestionComposer(
    {
      bank,
      role,
      editing = false,
      defaultScope,
      initialItems,
      lockScope = false,
      defaultFormat = "mcq",
      lockedScopeLabels,
    },
    ref,
  ) {
  const draftKey = `${DRAFT_PREFIX}:${bank}:${role}`;
  const { subjects, loading } = useSubjects({ limit: 500, isActive: true, sortBy: "name" });
  const [scope, setScope] = useState<ComposerScope>({ ...emptyScope(), ...defaultScope });
  const [items, setItems] = useState<ComposerItem[]>(initialItems?.length ? initialItems : [newItem()]);
  const [draftNote, setDraftNote] = useState("");
  const hydrated = useRef(false);

  // Apply exam / parent defaults when they arrive after mount.
  useEffect(() => {
    if (!defaultScope) return;
    const hasDefaults = Boolean(
      defaultScope.subjectName ||
        defaultScope.subjectId ||
        defaultScope.componentId ||
        defaultScope.grade,
    );
    if (!hasDefaults) return;
    setScope((prev) => ({
      ...prev,
      ...defaultScope,
      subjectId: defaultScope.subjectId || prev.subjectId,
      subjectCode: defaultScope.subjectCode || prev.subjectCode,
      componentId: defaultScope.componentId || prev.componentId,
      grade: defaultScope.grade || prev.grade,
      subjectName: defaultScope.subjectName || prev.subjectName,
      topic: defaultScope.topic ?? prev.topic,
      subtopic: defaultScope.subtopic ?? prev.subtopic,
    }));
  }, [defaultScope]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s._id === scope.subjectId),
    [subjects, scope.subjectId],
  );

  const subjectOptions = useMemo(() => {
    if (!scope.grade) return subjects;
    const grade = normalizeBatchGrade(scope.grade);
    return subjects.filter((s) => s.grade && normalizeBatchGrade(s.grade) === grade);
  }, [subjects, scope.grade]);

  const components: SubjectComponent[] = useMemo(
    () => (selectedSubject?.components || []).slice().sort((a, b) => a.order - b.order),
    [selectedSubject],
  );

  const selectedComponent = components.find((c) => c._id === scope.componentId);
  const format: ComposerFormat = selectedComponent?.type || defaultFormat;

  const chapterTopics = useMemo(
    () =>
      (selectedSubject?.chapters || [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c) => c.name),
    [selectedSubject],
  );

  useEffect(() => {
    if (editing || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { scope?: ComposerScope; items?: ComposerItem[] };
      // Never let a previous draft overwrite exam-inherited scope.
      if (parsed.scope && !lockScope) {
        setScope((prev) => ({ ...prev, ...parsed.scope }));
      }
      if (parsed.items?.length) setItems(parsed.items);
      setDraftNote(lockScope ? "Draft questions restored" : "Draft restored");
    } catch {
      /* ignore */
    }
  }, [draftKey, editing, lockScope]);

  useEffect(() => {
    if (editing) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({ scope, items }));
      setDraftNote("Draft saved");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draftKey, editing, scope, items]);

  useEffect(() => {
    if (scope.subjectId || (!scope.subjectName && !scope.subjectCode) || !subjects.length) return;
    const match =
      subjects.find(
        (subject) =>
          scope.subjectName &&
          subject.name.trim().toLowerCase() === scope.subjectName.trim().toLowerCase(),
      ) ||
      (scope.subjectCode
        ? subjects.find(
            (subject) =>
              subject.code?.trim().toUpperCase() === scope.subjectCode.trim().toUpperCase(),
          )
        : undefined);
    if (!match) return;
    setScope((prev) => ({
      ...prev,
      subjectId: match._id,
      subjectCode: match.code,
      subjectName: match.name,
      grade: prev.grade || (match.grade ? normalizeBatchGrade(match.grade) : ""),
    }));
  }, [subjects, scope.subjectId, scope.subjectName, scope.subjectCode]);

  useEffect(() => {
    if (lockScope) return;
    if (!scope.componentId && components.length === 1) {
      setScope((prev) => ({ ...prev, componentId: components[0]._id }));
    }
    if (scope.componentId && components.length && !components.some((c) => c._id === scope.componentId)) {
      setScope((prev) => ({ ...prev, componentId: "" }));
    }
  }, [components, scope.componentId, lockScope]);

  useEffect(() => {
    if (lockScope) return;
    if (scope.topic && chapterTopics.length && !chapterTopics.includes(scope.topic)) {
      setScope((prev) => ({ ...prev, topic: "" }));
    }
  }, [chapterTopics, scope.topic, lockScope]);

  useImperativeHandle(
    ref,
    () => ({
      getPayload: () => ({ scope, format, items }),
    }),
    [scope, format, items],
  );

  const patchScope = (patch: Partial<ComposerScope>) => setScope((prev) => ({ ...prev, ...patch }));

  const patchItem = (key: string, patch: Partial<ComposerItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const updateOption = (key: string, index: number, patch: Partial<{ text: string; isCorrect: boolean }>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const options = item.options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt));
        return { ...item, options };
      }),
    );
  };

  const lockedGradeLabel =
    lockedScopeLabels?.grade || (scope.grade ? formatGradeLabel(scope.grade) : "");
  const lockedSubjectLabel =
    lockedScopeLabels?.subject || scope.subjectName || scope.subjectCode || "";
  const lockedComponentLabel =
    lockedScopeLabels?.component ||
    (selectedComponent ? componentLabel(selectedComponent) : "") ||
    "Exam component";

  return (
    <div className="space-y-4">
      {lockScope ? (
        <>
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">
              Using this exam&apos;s class, subject, and component
            </p>
            <p className="mt-1 text-sm text-foreground/90">
              {[lockedGradeLabel, lockedSubjectLabel, lockedComponentLabel]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {draftNote ? <p className="mt-1 text-[11px] text-emerald-700">{draftNote}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Topic / chapter (optional)</label>
              <Select
                value={scope.topic || "__none__"}
                onValueChange={(topic) => patchScope({ topic: topic === "__none__" ? "" : topic })}
                disabled={!chapterTopics.length}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      chapterTopics.length ? "Select topic (optional)" : "No topics on this subject"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No topic</SelectItem>
                  {chapterTopics.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AttractiveInput
              label="Subtopic (optional)"
              value={scope.subtopic}
              onChange={(e) => patchScope({ subtopic: e.target.value })}
              size="sm"
            />
          </div>
        </>
      ) : (
        <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Class is optional. Subject filters to that class when one is selected.
        </p>
        {draftNote ? <p className="text-[11px] text-emerald-700">{draftNote}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Class / grade</label>
          <Select
            value={scope.grade || "none"}
            onValueChange={(grade) =>
              patchScope({
                grade: grade === "none" ? "" : grade,
                subjectId: "",
                subjectName: "",
                subjectCode: "",
                componentId: "",
                topic: "",
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All classes</SelectItem>
              {BATCH_GRADES.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {formatGradeLabel(grade)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Subject *</label>
          <Select
            value={scope.subjectId || undefined}
            onValueChange={(subjectId) => {
              const match = subjects.find((s) => s._id === subjectId);
              patchScope({
                subjectId,
                subjectName: match?.name || "",
                subjectCode: match?.code || "",
                grade: scope.grade || (match?.grade ? normalizeBatchGrade(match.grade) : ""),
                componentId: "",
                topic: "",
              });
            }}
            disabled={loading || !subjectOptions.length}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading…" : "Select subject"} />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((subject) => (
                <SelectItem key={subject._id} value={subject._id}>
                  {formatResourceSubjectOptionLabel(subject)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Component *</label>
          <Select
            value={scope.componentId || undefined}
            onValueChange={(componentId) => patchScope({ componentId })}
            disabled={!components.length}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !scope.subjectId
                    ? "Select a subject first"
                    : components.length
                      ? "Select component"
                      : "No components on this subject"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {components.map((component) => (
                <SelectItem key={component._id} value={component._id}>
                  {componentLabel(component)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedComponent ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedComponent.type === "mcq" ? "MCQ — 4 options" : "Written answer"}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Topic / chapter</label>
          <Select
            value={scope.topic || undefined}
            onValueChange={(topic) => patchScope({ topic })}
            disabled={!chapterTopics.length}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !scope.subjectId
                    ? "Select a subject first"
                    : chapterTopics.length
                      ? "Select topic (optional)"
                      : "No chapters on subject"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {chapterTopics.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AttractiveInput
        label="Subtopic (optional)"
        value={scope.subtopic}
        onChange={(e) => patchScope({ subtopic: e.target.value })}
        size="sm"
      />
        </>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <section key={item.key} className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Question {index + 1}</h4>
              {items.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems((prev) => prev.filter((row) => row.key !== item.key))}
                >
                  <LuTrash2 className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              ) : null}
            </div>

            <TipTapEditor
              value={item.questionText}
              onChange={(html) => patchItem(item.key, { questionText: html })}
              placeholder="Write the question. Use π / Σ for equations, or type e^(x^2 + 3)."
              minHeight="72px"
            />

            <div className="mt-2 grid grid-cols-2 gap-2">
              <AttractiveInput
                label="Marks"
                type="number"
                min={1}
                max={100}
                value={item.marks}
                onChange={(e) => patchItem(item.key, { marks: Number(e.target.value) || 1 })}
                size="sm"
              />
              <div>
                <label className="mb-1 block text-sm font-medium">Difficulty</label>
                <Select
                  value={item.difficulty}
                  onValueChange={(difficulty) =>
                    patchItem(item.key, { difficulty: difficulty as ComposerDifficulty })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {format === "mcq" ? (
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {item.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <Checkbox
                      checked={option.isCorrect}
                      onCheckedChange={(checked) =>
                        updateOption(item.key, optionIndex, { isCorrect: Boolean(checked) })
                      }
                    />
                    <AttractiveInput
                      className="flex-1"
                      value={option.text}
                      onChange={(e) => updateOption(item.key, optionIndex, { text: e.target.value })}
                      placeholder={`Option ${optionIndex + 1}`}
                      size="sm"
                    />
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">Tick the correct option.</p>
              </div>
            ) : (
              <div className="mt-2">
                <AttractiveTextarea
                  label="Model answer (optional)"
                  value={item.answerText}
                  onChange={(e) => patchItem(item.key, { answerText: e.target.value })}
                  rows={3}
                  placeholder="Expected written response"
                />
              </div>
            )}
          </section>
        ))}
      </div>

      {!editing ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, newItem()])}>
          <LuPlus className="mr-1 h-4 w-4" />
          Add another question
        </Button>
      ) : null}
    </div>
  );
  },
);

export function validateComposerPayload(payload: ComposerSubmitPayload) {
  if (!payload.scope.subjectName.trim()) {
    return "Select a subject";
  }
  if (!payload.scope.componentId) {
    return "Select an exam component";
  }
  if (!payload.items.length) return "Add at least one question";
  for (const [index, item] of payload.items.entries()) {
    if (!hasQuestionBody(item.questionText)) {
      return `Question ${index + 1} needs question text`;
    }
    if (payload.format === "mcq") {
      const filled = item.options.filter((option) => option.text.trim());
      if (filled.length < 2) return `Question ${index + 1} needs at least 2 options`;
      if (!filled.some((option) => option.isCorrect)) {
        return `Question ${index + 1} needs a correct option`;
      }
    }
  }
  return "";
}

export function clearComposerDraft(bank: "platform" | "course", role: "admin" | "instructor") {
  localStorage.removeItem(`${DRAFT_PREFIX}:${bank}:${role}`);
}

export function itemFromExisting(input: {
  questionText: string;
  options?: { text: string; isCorrect: boolean }[];
  answerText?: string;
  marks?: number;
  difficulty?: ComposerDifficulty;
}): ComposerItem {
  const options = emptyOptions();
  (input.options || []).slice(0, MCQ_OPTIONS).forEach((option, index) => {
    options[index] = { text: option.text, isCorrect: option.isCorrect };
  });
  return {
    key: `edit-${Date.now()}`,
    questionText: input.questionText,
    options,
    answerText: input.answerText || "",
    marks: input.marks || 1,
    difficulty: input.difficulty || "medium",
  };
}
