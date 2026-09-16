/** Query string shape for `GET /api/public/courses` (learning-project route). */
export type PublicCoursesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subjectId?: string;
  instructorId?: string;
  grade?: string;
  courseType?: "live" | "recorded";
  pricing?: "all" | "free" | "paid";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};
