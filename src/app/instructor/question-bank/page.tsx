import type { Metadata } from "next";
import InstructorQuestionBankPage from "./InstructorQuestionBankClient";

export const metadata: Metadata = {
  title: "Question bank",
};

export default function InstructorQuestionBankRoutePage() {
  return <InstructorQuestionBankPage />;
}
