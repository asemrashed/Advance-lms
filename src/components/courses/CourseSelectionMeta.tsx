'use client';

import { Input } from '@/components/ui/input';
import { formatGradeLabel } from '@/lib/courseLabel';
import type { StaffCourseOption } from '@/lib/staffCourses';
import { getStaffCourseMeta } from '@/lib/staffCourses';

type CourseSelectionMetaProps = {
  courseId?: string;
  courses: StaffCourseOption[];
};

export function CourseSelectionMeta({ courseId, courses }: CourseSelectionMetaProps) {
  const meta = getStaffCourseMeta(courses, courseId);
  if (!meta.subjectName && !meta.subjectCode && !meta.grade) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3 rounded-lg border border-border bg-muted/20 p-3">
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">Subject</p>
        <Input value={meta.subjectName || '—'} readOnly disabled className="bg-muted/40" />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">Subject code</p>
        <Input value={meta.subjectCode || '—'} readOnly disabled className="bg-muted/40" />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">Class / grade</p>
        <Input
          value={meta.grade ? formatGradeLabel(meta.grade) : '—'}
          readOnly
          disabled
          className="bg-muted/40"
        />
      </div>
    </div>
  );
}
