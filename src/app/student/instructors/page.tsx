import type { Metadata } from "next";
import StudentInstructorsClient from "./StudentInstructorsClient";

export const metadata: Metadata = {
  title: "Browse Instructors",
};

export default function StudentInstructorsPage() {
  return <StudentInstructorsClient />;
}
