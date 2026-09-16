import type { CourseFaq } from "@/types/courseFaq";
import type { Chapter } from "@/types/chapter";
import type { Lesson } from "@/types/lesson";
import type { PublicCourseDetailData } from "@/types/publicCourse";

export type PublicCourseByIdResponse = {
  success: true;
  data: PublicCourseDetailData;
};

export type PublicChaptersResponse = {
  success: true;
  data: { chapters: Chapter[] };
};

export type PublicLessonsResponse = {
  success: true;
  data: { lessons: Lesson[] };
};

export type PublicFaqsResponse = {
  success: true;
  data: { faqs: CourseFaq[] };
};
