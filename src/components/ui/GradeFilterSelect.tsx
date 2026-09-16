"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GRADE_FILTER_OPTIONS } from "@/lib/courseLabel";

type GradeFilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
};

export function GradeFilterSelect({
  value,
  onChange,
  className,
  placeholder = "Class / grade",
  allLabel = "All classes / grades",
  disabled = false,
}: GradeFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {GRADE_FILTER_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
