/** FAQ row from `GET /api/public/faqs?course=`. */
export interface CourseFaq {
  _id: string;
  question: string;
  answer: string;
  order: number;
}
