import type { Metadata } from "next";
import ExamsPage from "./AdminExamsClient";

export const metadata: Metadata = {
  title: "Exams",
};

export default function AdminExamsRoutePage() {
  return <ExamsPage />;
}
