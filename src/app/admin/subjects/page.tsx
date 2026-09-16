import type { Metadata } from "next";
import AdminSubjectsClient from "./AdminSubjectsClient";

export const metadata: Metadata = {
  title: "Subjects",
};

export default function AdminSubjectsPage() {
  return <AdminSubjectsClient />;
}
