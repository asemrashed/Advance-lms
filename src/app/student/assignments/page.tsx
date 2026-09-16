import type { Metadata } from "next";
import StudentAssignmentsPage from "./StudentAssignmentsClient";

export const metadata: Metadata = {
  title: "Assignments",
};

export default function StudentAssignmentsRoutePage() {
  return <StudentAssignmentsPage />;
}
