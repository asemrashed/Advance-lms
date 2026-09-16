"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { resourceScopeService } from "@/services/resourceScopeService";
import { formatGradeLabel } from "@/lib/courseLabel";
import type { ResourceCourseKind, ResourceScopeValue } from "@/types/resourceScope";

type CourseOption = {
  _id: string;
  label: string;
  subjectName?: string;
  subjectCode?: string;
  grade?: string;
};

type Option = { _id: string; label: string };

type ResourceScopeFieldsProps = {
  value: ResourceScopeValue;
  onChange: (next: ResourceScopeValue) => void;
  disabled?: boolean;
  /** Lock course type + course picker; chapter/lesson stay editable. */
  lockCourse?: boolean;
};

export function ResourceScopeFields({
  value,
  onChange,
  disabled = false,
  lockCourse = false,
}: ResourceScopeFieldsProps) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [chapters, setChapters] = useState<Option[]>([]);
  const [lessons, setLessons] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await resourceScopeService.listCourses(value.courseKind);
        if (!cancelled) setCourses(rows as CourseOption[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value.courseKind]);

  useEffect(() => {
    if (!value.courseId) {
      setChapters([]);
      setLessons([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const rows = await resourceScopeService.listChapters(value.courseId!);
      if (!cancelled) setChapters(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [value.courseId]);

  useEffect(() => {
    if (!value.chapterId) {
      setLessons([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const rows = await resourceScopeService.listLessons(value.chapterId!);
      if (!cancelled) setLessons(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [value.chapterId]);

  const setCourseKind = (courseKind: ResourceCourseKind) => {
    onChange({
      courseKind,
      courseId: undefined,
      chapterId: undefined,
      lessonId: undefined,
      subjectName: undefined,
      subjectCode: undefined,
      grade: undefined,
    });
  };

  const applyCourse = (courseId: string) => {
    const match = courses.find((c) => c._id === courseId);
    onChange({
      ...value,
      courseId,
      chapterId: undefined,
      lessonId: undefined,
      subjectName: match?.subjectName,
      subjectCode: match?.subjectCode,
      grade: match?.grade,
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      {/* When the course is locked (already inside a course), skip the course
          type / course / subject / grade fields — they add no value here. */}
      {!lockCourse && (
        <>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Course type</p>
            <Select
              value={value.courseKind}
              onValueChange={(v: ResourceCourseKind) => setCourseKind(v)}
              disabled={disabled || loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live course</SelectItem>
                <SelectItem value="recorded">Recorded course</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScopeSelect
            label="Course"
            placeholder="Select course"
            value={value.courseId}
            options={courses}
            disabled={disabled || loading}
            onChange={applyCourse}
          />

          {(value.subjectName || value.grade) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-foreground">Subject (from course)</p>
                <Input value={value.subjectName || ''} readOnly disabled className="bg-muted/40" />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-foreground">Class / grade (from course)</p>
                <Input
                  value={value.grade ? formatGradeLabel(value.grade) : ''}
                  readOnly
                  disabled
                  className="bg-muted/40"
                />
              </div>
            </div>
          )}
        </>
      )}

      <ScopeSelect
        label="Chapter / topic"
        placeholder="Select chapter"
        value={value.chapterId}
        options={chapters}
        disabled={disabled || !value.courseId}
        onChange={(chapterId) =>
          onChange({
            ...value,
            chapterId,
            lessonId: undefined,
          })
        }
      />

      <ScopeSelect
        label="Lesson"
        placeholder="Select lesson"
        value={value.lessonId}
        options={lessons}
        disabled={disabled || !value.chapterId}
        onChange={(lessonId) => onChange({ ...value, lessonId })}
      />
    </div>
  );
}

function ScopeSelect({
  label,
  placeholder,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  placeholder: string;
  value?: string;
  options: Option[];
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || options.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={options.length ? placeholder : "No options"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt._id} value={opt._id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { isResourceScopeComplete } from "@/types/resourceScope";
