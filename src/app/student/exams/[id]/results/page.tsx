import type { Metadata } from "next";
import ExamResultsPage from "./StudentExamResultsClient";

export const metadata: Metadata = {
  title: "Exam results",
};

export default function StudentExamResultsRoutePage() {
  return <ExamResultsPage />;
}
