import { formatCourseOptionLabel } from '@/lib/courseLabel';
import type { CourseType } from '@/types/unifiedCourse';

export type StaffCourseOption = {
  _id: string;
  title: string;
  courseType?: CourseType;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  grade?: string;
  label: string;
};

/** Staff-authenticated course list for admin/instructor modals. */
export async function fetchStaffCourses(
  courseType?: CourseType,
): Promise<StaffCourseOption[]> {
  const params = new URLSearchParams({ limit: '500', page: '1' });
  if (courseType) params.set('courseType', courseType);

  const response = await fetch(`/api/courses?${params}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok || !data.success) return [];

  const list = data.data?.courses ?? [];
  if (!Array.isArray(list)) return [];

  return list
    .map((c: Record<string, unknown>) => {
      const title = String(c.title ?? c.name ?? 'Untitled course');
      const subjectName =
        typeof c.subjectName === 'string' ? c.subjectName : undefined;
      const subjectId =
        typeof c.subjectId === 'string' ? c.subjectId : undefined;
      const subjectCode =
        typeof c.subjectCode === 'string' ? c.subjectCode : undefined;
      const grade = typeof c.grade === 'string' ? c.grade : undefined;
      return {
        _id: String(c._id ?? c.id ?? ''),
        title,
        courseType: c.courseType as CourseType | undefined,
        subjectId,
        subjectName,
        subjectCode,
        grade,
        label: formatCourseOptionLabel({ title, subjectName, grade }),
      };
    })
    .filter((c) => c._id);
}

export function getStaffCourseMeta(
  courses: StaffCourseOption[],
  courseId?: string,
): Pick<StaffCourseOption, 'subjectName' | 'subjectCode' | 'grade'> {
  if (!courseId || courseId === 'none') return {};
  const match = courses.find((c) => c._id === courseId);
  if (!match) return {};
  return {
    subjectName: match.subjectName,
    subjectCode: match.subjectCode,
    grade: match.grade,
  };
}
