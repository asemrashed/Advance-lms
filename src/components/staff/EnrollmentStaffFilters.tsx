"use client";

import type { ReactNode } from "react";
import { AttractiveInput } from "@/components/ui/attractive-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StaffFilterGrid, StaffSearchRow } from "@/components/staff/StaffResponsive";
import { LuSearch as Search, LuX as X } from "react-icons/lu";

interface EnrollmentStaffFiltersProps {
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  courseId: string;
  onCourseChange: (value: string) => void;
  courses: Array<{ _id: string; title: string }>;
  searchPlaceholder?: string;
  loading?: boolean;
  extra?: ReactNode;
}

export function EnrollmentStaffFilters({
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onClearSearch,
  courseId,
  onCourseChange,
  courses,
  searchPlaceholder = "Search student or course",
  loading = false,
  extra,
}: EnrollmentStaffFiltersProps) {
  return (
    <div className="w-full min-w-0 space-y-2">
      <StaffSearchRow>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <AttractiveInput
            type="text"
            placeholder={searchPlaceholder}
            value={searchDraft}
            onChange={(e) => onSearchDraftChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplySearch()}
            className="w-full min-w-0 pl-10"
            size="sm"
            disabled={loading}
          />
        </div>
        <Button onClick={onApplySearch} variant="secondary" disabled={loading} className="shrink-0">
          Search
        </Button>
        {searchDraft ? (
          <Button onClick={onClearSearch} variant="outline" size="icon" className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </StaffSearchRow>

      <StaffFilterGrid>
        <Select value={courseId} onValueChange={onCourseChange}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course._id} value={course._id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {extra}
      </StaffFilterGrid>
    </div>
  );
}
