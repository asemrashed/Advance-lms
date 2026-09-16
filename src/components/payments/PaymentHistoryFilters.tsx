"use client";

import { StaffFilterGrid, StaffSearchRow } from "@/components/staff/StaffResponsive";
import { AttractiveInput } from "@/components/ui/attractive-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BATCH_GRADES } from "@/lib/batchGrades";
import { formatGradeLabel } from "@/lib/courseLabel";
import type { PaymentFilters } from "@/types/payment";
import { LuSearch as Search, LuX as X } from "react-icons/lu";

export type PaymentFilterVariant = "student" | "instructor_students" | "instructor_own" | "admin_students" | "admin_instructors";

interface PaymentHistoryFiltersProps {
  variant: PaymentFilterVariant;
  filters: PaymentFilters;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  onFilterChange: (patch: Partial<PaymentFilters>) => void;
  courses?: Array<{ _id: string; title: string }>;
  batches?: Array<{ _id: string; name: string }>;
  instructors?: Array<{ _id: string; name: string }>;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

const triggerClass = "w-full min-w-0";

export function PaymentHistoryFilters({
  variant,
  filters,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onClearSearch,
  onFilterChange,
  courses = [],
  batches = [],
  instructors = [],
}: PaymentHistoryFiltersProps) {
  const searchPlaceholder =
    variant === "student" || variant === "instructor_own"
      ? "Search by transaction ID..."
      : variant === "admin_instructors"
        ? "Search by instructor name..."
        : "Search by student name...";

  const showCourseBatch =
    variant === "student" ||
    variant === "admin_students" ||
    variant === "instructor_students";

  const showCourseType =
    variant === "admin_students" || variant === "instructor_students";

  const showInstructorFilter = variant === "admin_students";

  const showSubject =
    variant === "admin_instructors" || variant === "instructor_own";

  return (
    <div className="w-full min-w-0 space-y-3">
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
          />
        </div>
        <Button onClick={onApplySearch} variant="secondary" className="shrink-0">
          Search
        </Button>
        {(searchDraft || filters.search) && (
          <Button onClick={onClearSearch} variant="outline" size="icon" className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </StaffSearchRow>

      <StaffFilterGrid>
        {showCourseType ? (
          <Select
            value={filters.method || "all"}
            onValueChange={(v) =>
              onFilterChange({
                method:
                  v === "all" ? undefined : (v as PaymentFilters["method"]),
                page: 1,
              })
            }
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline / cash</SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={filters.status || "all"}
          onValueChange={(v) =>
            onFilterChange({ status: v as PaymentFilters["status"], page: 1 })
          }
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.year || "all"}
          onValueChange={(v) =>
            onFilterChange({ year: v === "all" ? undefined : v, page: 1 })
          }
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.grade || "all"}
          onValueChange={(v) =>
            onFilterChange({ grade: v === "all" ? undefined : v, page: 1 })
          }
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {BATCH_GRADES.map((g) => (
              <SelectItem key={g} value={g}>
                {formatGradeLabel(g)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showCourseType && (
          <Select
            value={filters.courseType || "all"}
            onValueChange={(v) =>
              onFilterChange({
                courseType:
                  v === "all" ? undefined : (v as PaymentFilters["courseType"]),
                page: 1,
              })
            }
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="recorded">Recorded</SelectItem>
              <SelectItem value="live">Live</SelectItem>
            </SelectContent>
          </Select>
        )}

        {showCourseBatch && courses.length > 0 && (
          <Select
            value={filters.courseId || "all"}
            onValueChange={(v) =>
              onFilterChange({ courseId: v === "all" ? undefined : v, page: 1 })
            }
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showCourseBatch && batches.length > 0 && (
          <Select
            value={filters.batchId || "all"}
            onValueChange={(v) =>
              onFilterChange({ batchId: v === "all" ? undefined : v, page: 1 })
            }
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All batches</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showInstructorFilter && instructors.length > 0 && (
          <Select
            value={filters.instructorId || "all"}
            onValueChange={(v) =>
              onFilterChange({
                instructorId: v === "all" ? undefined : v,
                page: 1,
              })
            }
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Instructor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All instructors</SelectItem>
              {instructors.map((i) => (
                <SelectItem key={i._id} value={i._id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showSubject && (
          <AttractiveInput
            type="text"
            placeholder="Filter by subject..."
            value={filters.subject || ""}
            onChange={(e) =>
              onFilterChange({ subject: e.target.value || undefined, page: 1 })
            }
            className="w-full min-w-0"
            size="sm"
          />
        )}
      </StaffFilterGrid>
    </div>
  );
}
