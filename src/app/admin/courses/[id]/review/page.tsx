import type { Metadata } from "next";
import AdminCourseReviewClient from "./AdminCourseReviewClient";

export const metadata: Metadata = {
  title: "Review course",
};

export default function AdminCourseReviewPage() {
  return <AdminCourseReviewClient />;
}
