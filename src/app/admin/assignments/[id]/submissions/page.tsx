import type { Metadata } from "next";
import AssignmentSubmissionsPage from "./AdminSubmissionsClient";

export const metadata: Metadata = {
  title: "Submissions",
};

export default function AdminSubmissionsRoutePage() {
  return <AssignmentSubmissionsPage />;
}
