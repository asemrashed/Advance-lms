import type { Metadata } from "next";
import QuestionsPage from "./AdminExamQuestionsClient";

export const metadata: Metadata = {
  title: "Exam questions",
};

export default function AdminExamQuestionsRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <QuestionsPage params={params} />;
}
