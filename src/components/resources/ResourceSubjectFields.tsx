"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubjects } from "@/hooks/useSubjects";
import { BATCH_GRADES, normalizeBatchGrade, type BatchGrade } from "@/lib/batchGrades";
import { formatGradeLabel, formatResourceSubjectOptionLabel } from "@/lib/courseLabel";

export type ResourceSubjectValue = {
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  grade?: string;
  chapterName?: string;
  chapterNames?: string[];
};

function subjectLabel(subject: { name: string; code?: string | null }) {
  return formatResourceSubjectOptionLabel({
    name: subject.name,
    code: subject.code,
  });
}

export function ResourceSubjectFields({
  value,
  onChange,
  requireChapter = true,
  disabled = false,
  enableMultiChapter = false,
}: {
  value: ResourceSubjectValue;
  onChange: (value: ResourceSubjectValue, isUserAction?: boolean) => void;
  requireChapter?: boolean;
  disabled?: boolean;
  enableMultiChapter?: boolean;
}) {
  const { subjects, loading } = useSubjects({
    limit: 500,
    isActive: true,
    sortBy: "name",
  });

  const selected = useMemo(() => {
    if (!subjects.length) return undefined;
    const rawId =
      typeof value.subjectId === "object"
        ? (value.subjectId as unknown as { _id?: string })?._id
        : value.subjectId;
    const idStr = rawId ? String(rawId).trim() : "";
    const codeStr = value.subjectCode ? String(value.subjectCode).trim().toLowerCase() : "";
    const nameStr = value.subjectName ? String(value.subjectName).trim().toLowerCase() : "";

    if (idStr) {
      const match = subjects.find((subject) => String(subject._id) === idStr);
      if (match) return match;
    }
    if (codeStr) {
      const match = subjects.find(
        (subject) => (subject.code || "").trim().toLowerCase() === codeStr,
      );
      if (match) return match;
    }
    if (nameStr) {
      const exactMatch = subjects.find(
        (subject) => subject.name.trim().toLowerCase() === nameStr,
      );
      if (exactMatch) return exactMatch;

      const partialMatch = subjects.find(
        (subject) =>
          subject.name.trim().toLowerCase().includes(nameStr) ||
          nameStr.includes(subject.name.trim().toLowerCase()),
      );
      if (partialMatch) return partialMatch;
    }
    return undefined;
  }, [subjects, value.subjectId, value.subjectCode, value.subjectName]);

  const selectedId = selected?._id;
  const inferredGrade = selected?.grade
    ? normalizeBatchGrade(selected.grade)
    : value.grade
      ? normalizeBatchGrade(value.grade)
      : "";
  const selectedGrade = (BATCH_GRADES as readonly string[]).includes(inferredGrade)
    ? (inferredGrade as BatchGrade)
    : "";

  const gradeSubjects = useMemo(() => {
    if (!selectedGrade) return [];
    return subjects.filter(
      (subject) =>
        subject.grade && normalizeBatchGrade(subject.grade) === selectedGrade,
    );
  }, [subjects, selectedGrade]);

  const resolvedSubjectId =
    typeof value.subjectId === "object"
      ? (value.subjectId as unknown as { _id?: string })?._id
      : value.subjectId;
  const currentSubjectId = resolvedSubjectId ? String(resolvedSubjectId).trim() : "";

  useEffect(() => {
    if (!selected?._id || currentSubjectId === selected._id) return;
    onChange(
      {
        subjectId: selected._id,
        subjectName: selected.name,
        subjectCode: selected.code || value.subjectCode,
        grade: selected.grade || value.grade,
      },
      false,
    );
  }, [selectedId, currentSubjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [multiChapter, setMultiChapter] = useState(
    Boolean(value.chapterNames && value.chapterNames.length > 1),
  );

  useEffect(() => {
    setMultiChapter(Boolean(value.chapterNames && value.chapterNames.length > 1));
  }, [selectedId]);

  const chapters = (selected?.chapters || [])
    .slice()
    .sort((a, b) => a.order - b.order);

  const selectedChapterNames = useMemo(() => {
    if (value.chapterNames?.length) return value.chapterNames;
    return value.chapterName ? [value.chapterName] : [];
  }, [value.chapterName, value.chapterNames]);

  const emitChapters = (names: string[]) => {
    onChange(
      {
        chapterNames: names,
        chapterName: names[0],
      },
      true,
    );
  };

  const subjectPlaceholder = loading
    ? "Loading subjects…"
    : !selectedGrade
      ? "Select class first"
      : selected
        ? subjectLabel(selected)
        : value.subjectName
          ? value.subjectName
          : gradeSubjects.length
            ? "Select subject"
            : "No subjects for this class";

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Class / grade</p>
        <Select
          value={selectedGrade || undefined}
          disabled={disabled}
          onValueChange={(grade) => {
            if (!grade || grade === selectedGrade) return;
            onChange(
              {
                grade,
                subjectId: undefined,
                subjectName: undefined,
                subjectCode: undefined,
                chapterName: undefined,
                chapterNames: undefined,
              },
              true,
            );
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select class / grade" />
          </SelectTrigger>
          <SelectContent>
            {BATCH_GRADES.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {formatGradeLabel(grade)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Subject</p>
        <Select
          value={selected?._id}
          disabled={disabled || loading || !selectedGrade}
          onValueChange={(subjectId) => {
            if (!subjectId || subjectId === selected?._id) return;
            const subject = gradeSubjects.find((row) => row._id === subjectId);
            if (!subject) return;
            onChange(
              {
                subjectId,
                subjectName: subject.name,
                subjectCode: subject.code,
                grade: subject.grade || selectedGrade,
                chapterName: undefined,
                chapterNames: undefined,
              },
              true,
            );
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={subjectPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {gradeSubjects.map((subject) => (
              <SelectItem key={subject._id} value={subject._id}>
                {subjectLabel(subject)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {requireChapter ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Chapter / topic</p>
            {enableMultiChapter && !disabled ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const next = !multiChapter;
                  setMultiChapter(next);
                  if (next) {
                    emitChapters(selectedChapterNames);
                  } else {
                    const keep = selectedChapterNames[0];
                    onChange(
                      {
                        chapterName: keep,
                        chapterNames: keep ? [keep] : undefined,
                      },
                      true,
                    );
                  }
                }}
              >
                {multiChapter
                  ? "Select one chapter"
                  : "Select multiple chapters"}
              </Button>
            ) : null}
          </div>
          {multiChapter && enableMultiChapter ? (
            <div className="space-y-2">
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-input bg-white p-2">
                {chapters.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    {selected || value.subjectName
                      ? "No chapters configured"
                      : "Select subject first"}
                  </p>
                ) : (
                  chapters.map((chapter) => {
                    const checked = selectedChapterNames.some(
                      (name) =>
                        name.trim().toLowerCase() ===
                        chapter.name.trim().toLowerCase(),
                    );
                    return (
                      <label
                        key={`${chapter.order}-${chapter.name}`}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(state) => {
                            const next = new Set(selectedChapterNames);
                            if (state === true) next.add(chapter.name);
                            else {
                              for (const name of selectedChapterNames) {
                                if (
                                  name.trim().toLowerCase() ===
                                  chapter.name.trim().toLowerCase()
                                ) {
                                  next.delete(name);
                                }
                              }
                            }
                            emitChapters([...next]);
                          }}
                        />
                        <span>
                          {chapter.order}. {chapter.name}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {selectedChapterNames.length
                  ? `${selectedChapterNames.length} chapter${selectedChapterNames.length === 1 ? "" : "s"} selected`
                  : "Tick the chapters this note belongs to."}
              </p>
            </div>
          ) : (
            <Select
              value={value.chapterName || undefined}
              disabled={
                disabled ||
                loading ||
                !selectedGrade ||
                (!selected && !value.subjectName)
              }
              onValueChange={(chapterName) => {
                if (!chapterName || chapterName === value.chapterName) return;
                onChange({ chapterName, chapterNames: [chapterName] }, true);
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loading
                      ? "Loading chapters…"
                      : !selectedGrade
                        ? "Select class first"
                        : selected || value.subjectName
                          ? chapters.length || value.chapterName
                            ? "Select chapter / topic"
                            : "No chapters configured"
                          : "Select subject first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  <SelectItem key={`${chapter.order}-${chapter.name}`} value={chapter.name}>
                    {chapter.order}. {chapter.name}
                  </SelectItem>
                ))}
                {value.chapterName &&
                !chapters.some(
                  (c) => c.name.trim().toLowerCase() === value.chapterName?.trim().toLowerCase(),
                ) ? (
                  <SelectItem value={value.chapterName}>
                    {value.chapterName}
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : null}
    </div>
  );
}
