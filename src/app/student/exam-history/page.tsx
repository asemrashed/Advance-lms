import type { Metadata } from "next";
import ExamHistoryPage from "./StudentExamHistoryClient";

export const metadata: Metadata = {
  title: "Exam history",
};

export default function StudentExamHistoryPage() {
  return <ExamHistoryPage />;
}
