import type { Course } from "@/types/course";

/** Public API trims createdBy to { name, role } — not full CourseCreator. */
export type PublicCourseRow = Omit<
  Course,
  "createdBy" | "instructor" | "instructorInfo"
> & {
  createdBy: { name: string; role: string };
  instructor?: { _id: string; name: string };
};

export type PublicCoursesSuccessBody = {
  success: true;
  data: {
    courses: PublicCourseRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
};
