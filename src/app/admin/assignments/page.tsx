import type { Metadata } from "next";
import AssignmentsPage from "./AdminAssignmentsClient";

export const metadata: Metadata = {
  title: "Assignments",
};

export default function AdminAssignmentsRoutePage() {
  return <AssignmentsPage />;
}
