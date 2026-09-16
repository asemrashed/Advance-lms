import type { Metadata } from "next";
import InstructorPlatformQuestionBankPage from "./InstructorPlatformQuestionBankClient";

export const metadata: Metadata = {
  title: "Platform question bank",
};

export default function InstructorPlatformQuestionBankRoutePage() {
  return <InstructorPlatformQuestionBankPage />;
}
