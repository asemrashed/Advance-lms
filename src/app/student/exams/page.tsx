import type { Metadata } from "next";
import StudentExamsPage from "./StudentExamsClient";

export const metadata: Metadata = {
  title: "Exams",
};

export default function StudentExamsRoutePage() {
  return <StudentExamsPage />;
}
