import type { Metadata } from "next";
import AdminPlatformQuestionBankPage from "./AdminPlatformQuestionBankClient";

export const metadata: Metadata = {
  title: "Platform question bank",
};

export default function AdminPlatformQuestionBankRoutePage() {
  return <AdminPlatformQuestionBankPage />;
}
