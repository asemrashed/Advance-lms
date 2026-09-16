import type { Metadata } from "next";
import AdminViewSubmissionPage from "./AdminSubmissionDetailClient";

export const metadata: Metadata = {
  title: "Submission",
};

export default function AdminSubmissionDetailRoutePage() {
  return <AdminViewSubmissionPage />;
}
