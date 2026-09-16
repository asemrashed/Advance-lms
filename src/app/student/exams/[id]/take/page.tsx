import type { Metadata } from "next";
import ExamTakingPage from "./StudentExamTakeClient";

export const metadata: Metadata = {
  title: "Take exam",
};

export default function StudentExamTakeRoutePage() {
  return <ExamTakingPage />;
}
