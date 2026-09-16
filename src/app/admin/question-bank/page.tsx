import type { Metadata } from "next";
import QuestionBankPage from "./AdminQuestionBankClient";

export const metadata: Metadata = {
  title: "Question bank",
};

export default function AdminQuestionBankRoutePage() {
  return <QuestionBankPage />;
}
