import type { Metadata } from "next";
import InstructorExamsPage from "./InstructorExamsClient";

export const metadata: Metadata = {
  title: "Exams",
};

export default function InstructorExamsRoutePage() {
  return <InstructorExamsPage />;
}
