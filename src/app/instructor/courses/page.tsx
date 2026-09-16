import type { Metadata } from "next";
import CoursesPage from "./InstructorCoursesClient";

export const metadata: Metadata = {
  title: "My courses",
};

export default function InstructorCoursesRoutePage() {
  return <CoursesPage />;
}
