"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BATCH_GRADES, type BatchGrade } from "@/lib/batchGrades";
import { formatGradeLabel } from "@/lib/courseLabel";

export function resourceFilterPillClass(active: boolean) {
  return `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-slate-200 bg-white text-slate-700 hover:border-primary/40"
  }`;
}

type ResourceGradePillsProps = {
  value: BatchGrade;
  onChange: (grade: BatchGrade) => void;
  className?: string;
};

export function ResourceGradePills({
  value,
  onChange,
  className = "mb-3 flex gap-2 overflow-x-auto pb-1",
}: ResourceGradePillsProps) {
  return (
    <div className={className}>
      {BATCH_GRADES.map((grade) => (
        <button
          key={grade}
          type="button"
          onClick={() => onChange(grade)}
          className={resourceFilterPillClass(value === grade)}
        >
          {formatGradeLabel(grade)}
        </button>
      ))}
    </div>
  );
}

type ResourceSubjectSelectProps = {
  subjects: string[];
  value: string | null;
  onChange: (subject: string) => void;
  loading?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
};

export function ResourceSubjectSelect({
  subjects,
  value,
  onChange,
  loading = false,
  emptyLabel,
  placeholder = "Select subject",
  className,
  triggerClassName = "w-full lg:w-52",
}: ResourceSubjectSelectProps) {
  if (subjects.length === 0) {
    if (loading) {
      return (
        <div className={className}>
          <Select disabled>
            <SelectTrigger className={triggerClassName}>
              <SelectValue placeholder="Loading subjects…" />
            </SelectTrigger>
          </Select>
        </div>
      );
    }
    if (emptyLabel) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }
    return null;
  }

  return (
    <div className={className}>
      <Select
        value={value ?? undefined}
        onValueChange={onChange}
        disabled={loading}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((subject) => (
            <SelectItem key={subject} value={subject}>
              {subject}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type ResourceSubjectPillsProps = {
  subjects: string[];
  value: string | null;
  onChange: (subject: string) => void;
  loading?: boolean;
  emptyLabel?: string;
  className?: string;
};

export function ResourceSubjectPills({
  subjects,
  value,
  onChange,
  loading = false,
  emptyLabel,
  className = "mb-4 flex gap-2 overflow-x-auto pb-1",
}: ResourceSubjectPillsProps) {
  if (subjects.length > 0) {
    return (
      <div className={className}>
        {subjects.map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() => onChange(subject)}
            className={resourceFilterPillClass(value === subject)}
          >
            {subject}
          </button>
        ))}
      </div>
    );
  }

  if (loading) {
    return <div className="mb-4 h-10" />;
  }

  if (emptyLabel) {
    return <p className="mb-4 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return null;
}
