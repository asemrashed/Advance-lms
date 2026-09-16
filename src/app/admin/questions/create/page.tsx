import type { Metadata } from "next";
import CreateQuestionPage from "./AdminQuestionCreateClient";

export const metadata: Metadata = {
  title: "Create question",
};

export default function AdminQuestionCreateRoutePage() {
  return <CreateQuestionPage />;
}
