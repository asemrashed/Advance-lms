import type { Metadata } from "next";
import CoursesPage from "./AdminCoursesClient";

export const metadata: Metadata = {
  title: "Courses",
};

export default function AdminCoursesRoutePage() {
  return <CoursesPage />;
}
